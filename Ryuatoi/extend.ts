import { EventEmitter as Event } from "events";
import { File as IFile, Folder as IFolder, config, info, Info_Extend } from "./information";
import * as Yaml from "yaml";
import * as Path from "path";
import { promises as Fs } from "fs";

type EventType = "before" | "do" | "after";
class MyEvent {
    event: { [key: string]: (() => Promise<void>)[] } = {};
    register(type: EventType, func: () => Promise<void>) {
        if (this.event[type] === undefined) {
            this.event[type] = [];
        }
        this.event[type].push(func);
    }

    async execute(type: EventType): Promise<void> {
        if (this.event[type] === undefined) return;
        let tasks: Promise<void>[] = this.event[type].map(async item => { await item(); });
        await Promise.all(tasks);
    }

    async execute_all(): Promise<void> {
        await this.execute("before");
        await this.execute("do");
        await this.execute("after");
    }
}

class Render<T, V> {
    render_map: { [key: string]: string } = {};
    render: { [key: string]: T } = {};
    render_before = new Event();
    render_after = new Event();
    render_register(name: string, output: string, fn: T): void {
        this.render_map[name] = output;
        this.render[name] = fn;
    }
    render_before_register(name: string, fn: (value: V) => void): void {
        this.render_before.on(name, fn);
    }
    render_after_register(name: string, fn: (value: V) => void): void {
        this.render_after.on(name, fn);
    }
}

type template_func = (value: { path?: string, text?: string }, data: object) => Promise<string>;
class template_render extends Render<template_func, string> { }

type File_func = (output_path: string, value: IFile) => Promise<void>;
class File_render extends Render<File_func, IFile> { }

type Folder_func = (output_path: string, value: IFolder) => Promise<void>;
class Folder_render extends Render<Folder_func, IFolder> { };

export namespace Extend {
    export let tpl_stats: { tpl: string, data: object, path: string } = { tpl: "", data: {}, path: "" };
    export let tpl_funcs: { [key: string]: (...args: any) => string } = {};

    export let ReadEvent = new MyEvent();
    export let ReadFile: { [key: string]: (path: string, info: IFolder) => Promise<void> } = {};

    export let RenderEvent = new MyEvent();
    export let Template = new template_render();
    export let File = new File_render();
    export let Folder = new Folder_render();
}

export namespace Tool {
    export function Get_config(name: string): Info_Extend {
        return info.extends[name];
    }

    export function Front_matter(text: string): [object, string] {
        if (text === undefined || text === null) {
            throw new Error("text must have a value");
        }

        if (text.includes("---")) {
            text = text.substring(text.indexOf("---") + 3);
            let head: object = Yaml.parse(text.substring(0, text.indexOf("---")));
            let body: string = text.substring(text.indexOf("---") + 3);
            return [head, body];
        }
        else return [{}, text];
    }

    export function config_parse(value: string): string {
        for (let item in config) {
            value = value.replace(new RegExp(`\\[:\\(${item}\\):\\]`, "g"), config[item]);
        }
        return value;
    }

    export let render_file = async (output_path: string, value: IFile): Promise<void> => {
        if (value[":type"] !== null) Extend.File.render_before.emit(value[":type"]);
        if (value[":type"] !== null && value[":type"] in Extend.File.render) {
            await Extend.File.render[value[":type"]](output_path, value);
            Extend.File.render_after.emit(value[":type"]);
        }
        else if (value[":value"] !== null) {
            await Fs.writeFile(Path.join(output_path, value.fullname()), value[":value"]);
        }
    }

    export let render = async (output_path: string, value: IFolder): Promise<void> => {
        if (!await File_isExist(output_path))
            await Fs.mkdir(output_path);

        for (let item in value) {
            if (item[0] === ":" || item[0] === "_") continue;

            let v = value[item];
            if (v instanceof IFile) {
                await render_file(output_path, v);
            }
            else if (v instanceof IFolder) {
                if (v[":type"] !== null) Extend.Folder.render_before.emit(v[":type"]);
                if (v[":type"] !== null && v[":type"] in Extend.Folder.render) {
                    await Extend.Folder.render[v[":type"]](output_path, v);
                    Extend.Folder.render_after.emit(v[":type"]);
                }
                else {
                    await render(Path.join(output_path, v[":name"]), v);
                }
            }
        }
    }

    export function Path2Url(path: string) {
        path = path.substring(path.indexOf("output") + 7);
        return config.link + path.replace(/\\/g, "/");
    }

    export async function File_isExist(path: string): Promise<boolean> {
        return (await Fs.stat(path).catch(() => false)) ? true : false;
    }

    export async function Folder_Create(path: string): Promise<void> {
        if (!await File_isExist(path)) {
            await Fs.mkdir(path);
        }
    }

    export async function Folder_Remove(path: string): Promise<void> {
        if ((await Fs.stat(path)).isDirectory()) {
            let dirs: string[] = await Fs.readdir(path);
            await Promise.all(dirs.map(dir => Folder_Remove(Path.join(path, dir))));
            await Fs.rmdir(path);
        }
        else await Fs.unlink(path);
    }
}
import { EventEmitter as Event } from "events";
import { File as IFile, Folder as IFolder, config, info, Info_Extend } from "./information";
import * as Yaml from "yaml";
import * as Path from "path";
import { promises as Fs } from "fs";

class Render<T, V> {
    render_map: { [key: string]: string } = {};
    render: { [key: string]: T } = {};
    render_before: Event = new Event();
    render_after: Event = new Event();
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
    export let ReadFile: { [key: string]: (path: string, info: IFolder) => Promise<void> } = {};
    export let Template = new template_render();
    export let File = new File_render();
    export let Folder = new Folder_render();
    
    export let event = new Event();
    export function read_after_register(func: (...args: any) => void): void {
        event.on("read_after", func);
    }
    export function read_after_emit() { event.emit("read_after"); }

    export function render_after_register(func: (...arg: any) => void): void {
        event.on("render_after", func);
    }
    export function render_after_emit() { event.emit("render_after"); }

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

    export let render = async (output_path: string, value: IFolder): Promise<void> => {
        if (!await File_isExist(output_path))
            await Fs.mkdir(output_path);

        for (let item in value) {
            if (item[0] === ":" || item[0] === "_") continue;
            
            let v = value[item];
            if (v instanceof IFile) {
                if (v[":type"] !== null) Extend.File.render_before.emit(v[":type"]);
                if (v[":type"] !== null && v[":type"] in Extend.File.render) {
                    await Extend.File.render[v[":type"]](output_path, v);
                    Extend.File.render_after.emit(v[":type"]);
                }
                else {
                    if (v[":value"] !== null)
                        await Fs.writeFile(Path.join(output_path, v.fullname()), v[":value"]);
                }
            }
            else if (v instanceof IFolder) {
                if (v[":type"] !== null) Extend.Folder.render_before.emit(v[":type"]);
                if (v[":type"] !== null && v[":type"] in Extend.Folder.render) {
                    await Extend.Folder.render[v[":type"]](output_path, v);
                    Extend.Folder.render_after.emit(v[":type"]);
                }
                else {
                    render(Path.join(output_path, v[":name"]), v);
                }
            }
        }
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
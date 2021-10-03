import { promises as Fs } from "fs";
import * as Yaml from "yaml";
import * as Path from "path";
import { Extend, Tool } from "./extend";

export class File {
    [value: string]: any;
    ":name": string;
    ":type": string | null;
    ":value": Buffer | null;
    ":path": string;

    constructor(name: string = "", type: string | null = null, value: Buffer | null = null, path: string = "") {
        this[":name"] = name;
        this[":type"] = type;
        this[":value"] = value;
        this[":path"] = path;
    }

    fullname(): string {
        return `${this[":name"]}.${this[":type"]}`;
    }

    fullpath(): string {
        return Path.join(this[":path"], this.fullname());
    }
}

export class Folder {
    [value: string]: File | Folder | string | object | null;
    ":name": string;
    ":type": string | null;
    ":config": { [key: string]: any };
    ":path": string;

    constructor(name: string = "", type: string | null = null, config: object = {}, path: string = "") {
        this[":name"] = name;
        this[":type"] = type;
        this[":config"] = config;
        this[":path"] = path;
    }
}

export function fdir(path: string): string {
    return Path.dirname(path);
}

export function fbase(path: string): string {
    return Path.basename(path);
}

export function fname(path: string): string {
    let name: string = Path.basename(path);
    if (name.includes(".")) {
        name = name.substring(0, name.lastIndexOf("."));
    }
    return name;
}

export function ftype(path: string): string {
    return Path.extname(path).substring(1);
}

async function readfiles(path: string, info: Folder): Promise<void> {
    let files: string[] = await Fs.readdir(path);
    let pro_files = files.map(async item => {
        let npath: string = Path.join(path, item);
        if ((await Fs.stat(npath)).isDirectory()) {
            let name: string = item;
            let type: string | null = null;

            if (item[0] === "[") {
                name = item.substring(item.indexOf("]") + 1);
                type = item.substring(1, item.indexOf("]"));
            }
            await readfiles(npath, (info[name] = new Folder(name, type, {}, npath)));
        }
        else {
            if (item === "config.yml") {
                //Object.assign(info, Yaml.parse(await Fs.readFile(npath, "utf-8")));
                info[":config"] = Object.assign(info[":config"], Yaml.parse(Tool.config_parse(await Fs.readFile(npath, "utf-8"))));
            }
            else if (ftype(item) in Extend.ReadFile) {
                await Extend.ReadFile[ftype(item)](npath, info);
            }
            else {
                info[fname(item)] = new File(fname(item), ftype(item), await Fs.readFile(npath), npath);
            }
        }
    });

    await Promise.all(pro_files);
}

export class Info_Extend {
    [key: string]: any;
    name: string = "";
    version: string = "";
    main: string = "";
    priority: number = 0;
}

export class Info {
    [key: string]: any;
    config: Folder = new Folder("config");
    theme: Folder = new Folder("theme");
    posts_map: { [key: number]: File } = {};
    posts: Folder = new Folder("posts");
    tags: { [key: string]: number[] } = {};
    extends: { [key: string]: Info_Extend } = {};
}

export let info = new Info();

const extend_path = "./extends";
async function load_extends(): Promise<void> {
    let exts: string[] = await Fs.readdir(extend_path);
    let list: Info_Extend[] = [];
    for (let ext of exts) {
        let config: string = await Fs.readFile(Path.join(extend_path, ext, "config.yml"), "utf-8");
        let value: Info_Extend = Yaml.parse(Tool.config_parse(config));
        list.push(value);
    }

    list.sort((a: Info_Extend, b: Info_Extend) => { return a.priority - b.priority; });
    list.forEach(v => {
        info.extends[v["name"]] = v;
        require(`./${Path.join(extend_path, v.name, v["main"])}`);
    })
}

class Config {
    [key: string]: string;
    name: string = "";
    description: string = "";
    link: string = "";
    image: string = "";
    copyright: string = "";
    theme: string = "";
    theme_path: string = "";
    posts_path: string = "";
    config_path: string = "";
    output_path: string = "";
    extends_path: string = "";
}

export let config = new Config();
let load_config = async () => {
    info.config[":config"] = new Config();
    info.config[":config"].config_path = Path.resolve("./config");
    info.config[":config"].posts_path = Path.resolve("./posts");
    info.config[":config"].output_path = Path.resolve("./output");
    info.config[":config"].extends_path = Path.resolve("./extends");

    info.config[":config"] = Object.assign(
        info.config[":config"],
        Yaml.parse(await Fs.readFile(Path.join(info.config[":config"].config_path, "config.yml"), "utf-8"))
    );

    info.config[":config"].theme_path = Path.resolve(Path.join("./themes", info.config[":config"].theme));

    info.config[":config"] = Object.assign(
        info.config[":config"],
        Yaml.parse(await Fs.readFile(Path.join(info.config[":config"].theme_path, "_config.yml"), "utf-8"))
    );

    config = info.config[":config"] as Config;
}

export async function getinfo(callback: () => void) {
    await Extend.ReadEvent.execute("before");

    await load_config();
    console.log("load default config success!");

    await load_extends();
    console.log("load extends success!");

    await readfiles(config.config_path, info.config);

    console.log("info.config => ", info.config);

    console.log("theme_path => ", config.theme_path);
    await readfiles(config.posts_path, info.posts);
    await readfiles(config.theme_path, info.theme);

    await Extend.ReadEvent.execute("do");
    await Extend.ReadEvent.execute("after");
    callback();
}

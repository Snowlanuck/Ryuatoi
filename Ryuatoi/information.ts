import { promises as Fs } from "fs";
import * as Yaml from "yaml";
import * as Feed from "feed";
import * as Path from "path";
import * as Default from "./default"

export class file {
    [value: string]: any;
    constructor(public _name: string = "", public _type: string = null, public _value: string = "", public _path: string = "") { }
}

export class folder {
    [value: string]: file | folder | string | object;
    constructor(public _name: string = "", public _type: string = null, public _config: object = {}, public _path: string = "") { }
}

function fdir(path: string): string {
    return Path.dirname(path);
}

function fbase(path: string): string {
    return Path.basename(path);
}

function fname(path: string): string {
    let name: string = Path.basename(path);
    if (name.includes(".")) {
        name = name.substring(0, name.lastIndexOf("."));
    }
    return name;
}

function ftype(path: string): string {
    return Path.extname(path).substring(1);
}

async function readfiles(path: string, info: folder, read: (path: string, info: folder) => Promise<void>): Promise<void> {
    let files: string[] = await Fs.readdir(path);
    let pro_files = files.map(async item => {
        let npath: string = Path.join(path, item);
        if ((await Fs.stat(npath)).isDirectory()) {
            if (item[0] === "[") {
                let type: string = item.substring(1, item.indexOf("]"));
                let name: string = item.substring(item.indexOf("]") + 1);
                
                await readfiles(npath, (info[name] = new folder(name, type, {}, npath)), read);
            }
            else {
                await readfiles(npath, (info[item] = new folder(item, null, {}, npath)), read);
            }
        }
        else {
            await read(npath, info);
        }
    });

    await Promise.all(pro_files);
}

async function getfile(path: string): Promise<file> {
    let res = new file(fname(path), ftype(path), "", fdir(path));
    let value: string = await Fs.readFile(path, "utf-8");
    if (!value.includes("---")) {
        res._value = value;
    }
    else {
        let head: string = value.substring(value.indexOf("---") + 3);
        Object.assign(res, Yaml.parse(head.substring(0, head.indexOf("---"))));
        res._value = head.substring(head.indexOf("---") + 3);
    }

    return res;
}

async function readconfig(path: string, info: folder) {
    let name: string = fname(path);
    let type: string = ftype(path);
    info[name] = Object.assign(new file(name, type, "", fdir(path)), Yaml.parse(await Fs.readFile(path, "utf-8")));
}

let posts_map = new Map<number, file>();
let posts_cnt = 0;

async function readpost(path: string, info: folder) {
    if (fbase(path) === "config.yml") {
        info._config = Yaml.parse(await Fs.readFile(path, "utf-8"));
    }
    else {
        let value: file = Object.assign(new file(), Default.post, await getfile(path));
        posts_map.set(posts_cnt, value);
        info[fname(path)] = Object.assign(new file(fname(path), ftype(path), "", fdir(path)), { id: posts_cnt });
        posts_cnt++;
    }
}

async function readtheme(path: string, info: folder) {
    let name: string = fname(path);
    let type: string = ftype(path);

    if (type === "sjs") {
        info[name] = Object.assign(new file(), Default.sjs, await getfile(path));
    }
    else if (name === "config" && type === "yml") {
        info._config = Object.assign(new file(name, type, "", fdir(path)), Yaml.parse(await Fs.readFile(path, "utf-8")));
    }
    else {
        info[name] = Object.assign(new file(name, type), Default.sjs, await getfile(path));
    }
}

function gettag(posts: folder | file, tags: Map<string, number[]>) {
    if (posts instanceof file) {
        let post: file = posts_map.get(posts.id);
        for (let tag of post.tags) {
            if (!(tag in tags)) {
                tags[tag] = new Array<number>();
            }
            tags[tag].push(posts.id);
        }
    }
    else for (let post in posts) {
        if (post[0] === "_") continue;
        gettag(posts[post] as folder | file, tags);
    }
}

const config_path = "./config";
const posts_path = "./posts";
let theme_path: string;

export let info = {
    config: new folder("config"),
    theme: new folder("theme"),
    posts_map: new Map<number, file>(),
    posts: new folder("posts"),
    tags: new Map<string, number[]>()
};

export function getinfo(callback) {
    (async () => {
        await readfiles(config_path, info.config, readconfig);
        await readfiles(posts_path, info.posts, readpost);
        info.posts_map = posts_map;

        theme_path = Path.join("./themes/", info.config["setting"]["config"]["theme"]);

        await readfiles(theme_path, info.theme, readtheme);
        if (!("config" in info.theme)) {
            info.theme["config"] = { ...Default.theme_config, type: "yml" };
        }

        gettag(info.posts, info.tags);

        //console.dir(info, { depth: null });
        callback(info);
    })();
}

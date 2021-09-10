import { promises as Fs } from "fs";
import * as Sass from "sass";
import * as Path from "path";
import tpl from "./tpl";
import { getinfo, info as tinfo, file, folder } from "./information";

const output_path = "./output";
const posts_path = "./output/posts";

let info = tinfo;
let theme_config: object;
let theme_path: string;

async function File_isExist(path: string): Promise<boolean> {
    return (await Fs.stat(path).catch(() => false)) ? true : false;
}

async function Folder_Create(path: string): Promise<void> {
    if (!await File_isExist(path)) {
        await Fs.mkdir(path);
    }
}

function GetPostById(id: number) {
    return info.posts_map.get(id);
}

let file_funcs: { [key: string]: (path: string, post: file) => Promise<void> } = {};
let file_template: { [key: string]: string } = {};

file_funcs["md"] = async (path: string, post: file) => {
    await Fs.writeFile(Path.join(path, `${post._name}.html`), tpl(file_template["md"], post, post._path));
}

file_funcs["book_page"] = async (path: string, post: file) => {
    await Fs.writeFile(path, tpl(file_template["book_page"], post, post._path));
}

let folder_funcs: { [key: string]: (path: string, posts: folder) => Promise<void> } = {};
let folder_template: { [key: string]: string } = {};

folder_funcs["post"] = async (path: string, posts: folder) => {
    await Folder_Create(path);

    for (let item in posts) {
        let v = posts[item];
        if (v instanceof file) {
            if (v._type in file_funcs) {
                await file_funcs[v._type](path, GetPostById(v.id));
            }
            else {
                await Fs.writeFile(Path.join(path, v.fullname()), v._value);
            }
        }
        else if (v instanceof folder) {
            if (v._type in folder_funcs) {
                await folder_funcs[v._type](path, v);
            }
            else await folder_funcs["post"](Path.join(path, v._name), v);
        }
    }
}

folder_funcs["book"] = async (path: string, posts: folder) => {
    let get_book_value = async (path: string, posts: folder) => {
        await Folder_Create(path);
        let thisfunc = get_book_value;

        for (let item in posts) {
            if (item[0] === "_") continue;
            if (posts[item] instanceof folder) {
                await Fs.writeFile(Path.join(path, "catalog.html"), tpl(folder_template["book"], posts, posts._path));
                await thisfunc(Path.join(path, item), posts[item] as folder);
            }
            else {
                let post = GetPostById(posts[item]["id"]);
                await Fs.writeFile(Path.join(path, `${post.title}.html`), tpl(file_template[post._type], post, post._path));
            }
        }
    }

    await get_book_value(path, posts);
}

let generator_post = async (path: string, posts: folder = info["posts"]): Promise<void> => {
    await Folder_Create(path);

    for (let item in posts) {
        if (item[0] === "_") continue;

        let post = posts[item] as file | folder;
        // console.log("post = >", post, "path => ", path);
        if (post instanceof file) {
            if (!(post._type in file_funcs)) {
                await Fs.writeFile(Path.join(path, post.fullname()), post._value);
            }
            else {
                let value: file = GetPostById(post.id);
                // console.log("value => ", value);
                await file_funcs[value._type](path, value);
            }
        }
        else if (post._type !== null) {
            // console.log("Come in! post => ", post);
            await folder_funcs[post._type](Path.join(path, item), post);
        }
        else {
            await generator_post(Path.join(path, item), post);
        }
    }
}

let generator_sjs = async (value: folder | file = info.theme, path: string = ""): Promise<void> => {
    if (value instanceof folder) {
        for (let item in value) {
            if (item[0] === "_") continue;
            if (item in file_funcs) continue;

            if (value[item] instanceof file) {
                let v: file = value[item] as file;

                if (!v["is_generator"]) continue;
                let npath: string = Path.join(output_path, path);
                if (!await File_isExist(npath)) {
                    await Fs.mkdir(npath);
                }

                if (v._type === "sjs") {
                    await Fs.writeFile(Path.join(npath, `${v._name}.html`), tpl(v._value.toString(), v, v._path));
                }
                else if (v._type === "sass") {
                    await Fs.writeFile(Path.join(npath, `${v._name}.css`), Sass.renderSync({ data: v._value.toString() }).css);
                }
                else {
                    await Fs.writeFile(Path.join(npath, `${v._name}.${v._type}`), v._value);
                }
            }
            else await generator_sjs(value[item] as folder, Path.join(path, item));
        }
    }
}

async function rmdir(path: string): Promise<void> {
    if ((await Fs.stat(path)).isDirectory()) {
        let dirs: string[] = await Fs.readdir(path);
        await Promise.all(dirs.map(dir => rmdir(Path.join(path, dir))));
        await Fs.rmdir(path);
    }
    else await Fs.unlink(path);
}

let get_type_funcs = async (funcs: { [key: string]: any }, template: { [key: string]: string }, pre: string): Promise<void> => {
    for (let type in funcs) {
        let path: string = Path.join(theme_path, `${theme_config[`${pre}_${type}`]}`);
        if (!await File_isExist(path)) continue;
        template[type] = await Fs.readFile(path, "utf-8");
    }
}

let generator = () => {
    getinfo(async value => {
        console.dir(value, { depth: null });
        if (await File_isExist(output_path)) {
            await rmdir(output_path);
        }

        await Fs.mkdir(output_path);

        info = value;
        let configs = info["config"];
        theme_path = Path.join("./themes/", configs["setting"]["config"]["theme"]);
        theme_config = info.theme["config"] as object;

        await Fs.mkdir(posts_path);
        await get_type_funcs(file_funcs, file_template, "file_template");
        await get_type_funcs(folder_funcs, folder_template, "folder_template");

        await generator_post(posts_path);
        console.log("generator_post OK!");
        await generator_sjs();
        console.log("generator_sjs OK!");
    });
}

generator();
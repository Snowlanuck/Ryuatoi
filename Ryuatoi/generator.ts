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

let post_type_funcs: { [key: string]: (path: string, post: file) => void } = {};
let post_type_template: { [key: string]: string } = {};

post_type_funcs["md"] = (path: string, post: file) => {
    Fs.writeFile(path, tpl(post_type_template["md"], post, post._path));
}

post_type_funcs["book_page"] = (path: string, post: file) => {
    Fs.writeFile(path, tpl(post_type_template["book_page"], post, post._path));
}

let post_list_type_funcs: { [key: string]: (path: string, posts: folder | file) => Promise<void> } = {};
let post_list_type_template: { [key: string]: string } = {};

post_list_type_funcs["book"] = async (path: string, posts: folder | file) => {
    let get_book_value = async (path: string, posts: folder | file) => {
        await Folder_Create(path);
        let thisfunc = get_book_value;

        for (let item in posts) {
            if (item[0] === "_") continue;
            if (posts[item] instanceof folder) {
                Fs.writeFile(Path.join(path, "catalog.html"), tpl(post_list_type_template["book"], posts, posts._path));
                await thisfunc(Path.join(path, item), posts[item]);
            }
            else {
                let post = info.posts_map.get(posts[item].id);
                Fs.writeFile(Path.join(path, `${post.title}.html`), tpl(post_type_template[post._type], post, post._path));
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
        if (post instanceof file) {
            let value: file = info.posts_map.get(post.id);
            post_type_funcs[value._type](Path.join(path, `${value.title}.html`), value);
        }
        else if (post._type !== null) {
            await post_list_type_funcs[post._type](Path.join(path, item), post);
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
            if (item in post_type_funcs) continue;

            if (value[item] instanceof file) {
                let v: file = value[item] as file;

                if (!v["is_generator"]) continue;
                let npath: string = Path.join(output_path, path);
                if (!await File_isExist(npath)) {
                    await Fs.mkdir(npath);
                }

                if (v._type === "sjs") {
                    await Fs.writeFile(Path.join(npath, `${v._name}.html`), tpl(v._value, v, v._path));
                }
                else if (v._type === "sass") {
                    await Fs.writeFile(Path.join(npath, `${v._name}.css`), Sass.renderSync({ data: v._value }).css);
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

let get_type_funcs = async (funcs: { [key: string]: any }, template: { [key: string]: string }): Promise<void> => {
    for (let type in funcs) {
        let path: string = Path.join(theme_path, `${theme_config[`${type}_template`]}`);
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
        await get_type_funcs(post_type_funcs, post_type_template);
        await get_type_funcs(post_list_type_funcs, post_list_type_template);

        await generator_post(posts_path);
        console.log("generator_post OK!");
        await generator_sjs();
    });
}

generator();
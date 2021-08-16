"use strict"

const fs = require("fs").promises;
const sass = require("node-sass");
const tpl = require("./tpl");
const getinfo = require("./information");
//getinfo(value => { console.dir(value, { depth: null }); });

const output_path = "./output";
const posts_path = "./output/posts";

async function File_isExist(path) {
    return (await fs.stat(path).catch(() => false)) ? true : false;
}

async function Folder_Create(path) {
    if (!await File_isExist(path)) {
        await fs.mkdir(path);
    }
}

let post_type_funcs = {};
let post_type_template = {};

post_type_funcs["article"] = (path, post) => {
    fs.writeFile(path, tpl.main(post_type_template["article"], post));
}

post_type_funcs["book_page"] = (path, post) => {
    fs.writeFile(path, tpl.main(post_type_template["book_page"], post));
}

let post_list_type_funcs = {};
let post_list_type_template = {};

post_list_type_funcs["book"] = async (path, posts) => {
    let get_book_value = async (path, posts) => {
        await Folder_Create(path);
        let thisfunc = get_book_value;
    
        for (let item in posts) {
            if (item[0] == '_') continue;
            if (posts[item]["_ftype"] === "folder") {
                fs.writeFile(`${path}/catalog.html`, tpl.main(post_list_type_template["book"], { value: posts } ));
                await thisfunc(`${path}/${item}`, posts[item]);
            }
            else {
                let post = posts_map.get(posts[item]["id"]);
                fs.writeFile(`${path}/${post["title"]}.html`, tpl.main( post_type_template["book_page"], post));
            }
        }
    }

    await get_book_value(path, posts);
}

let generator_post = async (path, posts = tpl.data["posts"]) => {
    await Folder_Create(path);
    
    for (let item in posts) {
        if (item[0] === '_') continue;
        
        let post = posts[item];
        //console.log(post);

        if (post["_ftype"] === "file") {
            post = tpl.data["posts_map"].get(post["id"]);
            post_type_funcs[post["type"]](`${path}/${post["title"]}.html`, post);
        }
        else if ("_type" in post) {
            await post_list_type_funcs[post["_type"]](`${path}/${item}`, post);
        }
        else {
            generator_post(`${path}/${item}`, post);
        }
    }
}

let generator_sjs = async (value = tpl.data["theme"], path = "", data = tpl.data) => {
    //console.log("========================================");
    //console.dir(value, { depth: null });
    for (let item in value) {
        if (item[0] === '_') continue;
        if (item in post_type_funcs) continue;
        //if ("type" in value[item]) {
        if (value["_ftype"] === "file") {

            if (!value[item]["is_generator"]) continue;

            let npath = `${output_path}/${path}`;
            if (!await File_isExist(npath))
                await fs.mkdir(npath);
            
            if (value[item]["type"] == "sjs") {
                fs.writeFile(`${npath}/${item}.html`, tpl.main(value[item]["content"], data));
            }
            else if (value[item]["type"] == "sass") {
                //console.log(sass.renderSync({ data: value[item]["content"] }).css);
                fs.writeFile(`${npath}/${item}.css`, sass.renderSync({ data: value[item]["content"] }).css);
            }
            else {
                fs.writeFile(`${npath}/${item}.${value[item]["type"]}`, value[item]["content"]);
            }
        }
        else generator_sjs(value[item], `${path}/${item}`);
    }
}

async function rmdir(path) {
    if ((await fs.stat(path)).isDirectory()) {
        let dirs = await fs.readdir(path);
        dirs = dirs.map(dir => rmdir(`${path}/${dir}`));
        await Promise.all(dirs);
        await fs.rmdir(path);
    }
    else await fs.unlink(path);
}

let get_type_funcs = async (funcs, template) => {
    for (let type in funcs) {
        let path = `${theme_path}/${theme_config[`${type}_template`]}`;
        if (!await File_isExist(path)) continue;
        template[type] = await fs.readFile(path, "utf8");
    }
}

let theme_config;
let theme_path;
let posts_map;

let generator = () => {
    getinfo(async value => {
        //console.dir(value, { depth: null });
        if (await File_isExist(output_path))
            await rmdir(output_path);
        await fs.mkdir(output_path);
        //return;
        let configs = value["config"];

        tpl.data = value;
        tpl.path = theme_path;

        theme_config = value["theme"]["config"];
        theme_path = `./themes/${configs["setting"]["config"]["theme"]}`;
        posts_map = tpl.data["posts_map"];
        
        await fs.mkdir(posts_path);
        await get_type_funcs(post_type_funcs, post_type_template);
        await get_type_funcs(post_list_type_funcs, post_list_type_template);

        generator_post(posts_path);

        generator_sjs();
    });
}

generator();

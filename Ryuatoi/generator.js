"use strict"

const fs = require("fs").promises;
const sass = require("node-sass");
const tpl = require("./tpl");
const getinfo = require("./information");
//getinfo(value => { console.dir(value, { depth: null }); });

const output_path = "./output";
const posts_path = "./output/posts";

let post_type_funcs = {};
let post_type_template = {};

post_type_funcs["article"] = (path, post) => {
    fs.writeFile(path, tpl.main(post_type_template["article"], post));
}

post_type_funcs["book"] = (path, post) => {
    
}

let generator_post = async (path, posts = tpl.data["posts"]) => {
    for (let item in posts) {
        let post = posts[item];
        if ("type" in post) {
            post_type_funcs[post["type"]](`${path}/${item}.html`, post);
        }
        else generator_post(`${path}/${item}`, post);
    }
}

let generator_sjs = async (value = tpl.data["theme"], path = "", data = tpl.data) => {
    for (let item in value) {
        if (item in post_type_funcs) continue;
        if ("type" in value[item]) {
            if (!value[item]["is_generator"]) continue;

            let npath = `${output_path}/${path}`;
            if (!await fs.stat(npath).catch(() => false))
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

let generator = () => {
    getinfo(async value => {
        if (await fs.stat(output_path).catch(() => false))
            await rmdir(output_path);
        await fs.mkdir(output_path);

        let configs = value["config"];
        //console.dir(value, { depth: null });

        const theme_config = value["theme"]["config"];
        const theme_path = `./themes/${configs["setting"]["config"]["theme"]}`;
        tpl.data = value;
        tpl.path = theme_path;
        
        await fs.mkdir(posts_path);

        for (let type in post_type_funcs) {
            let path = `${theme_path}/${theme_config[`${type}_template`]}`;
            if (!await fs.stat(path).catch(() => false)) continue;
            post_type_template[type] = await fs.readFile(path, "utf8");
        }

        generator_post(posts_path);
        generator_sjs();
    });
}

generator();

"use strict"

const fs = require("fs");
const tpl = require("./tpl");
const getinfo = require("./information");
//getinfo(value => { console.dir(value, { depth: null }); });

const output_path = "./output";
const posts_path = "./output/posts";

let generator_sjs = async (value = tpl.data["theme"], path = "", data = tpl.data) => {
    for (let item in value) {
        if ("content" in value[item]) {
            if (!value[item]["is_generator"]) continue;
            fs.promises.writeFile(
                `${output_path}/${path}/${item}.html`,
                tpl.main(value[item]["content"], data));
        }
        else generator_sjs(value[item], `${path}/${item}`);
    }
}

let post_type_funcs = {};
post_type_funcs["post"] = (path, post) => {
    fs.promises.writeFile(path, post["content"]);
}

post_type_funcs["book"] = (path, post) => {
    
}

let generator_post = async (path, posts = tpl.data["posts"]) => {
    for (let item in posts) {
        let post = posts[item];
        if ("title" in post) {
            post_type_funcs[post["type"]](`${path}/${item}.html`, post);
        }
        else generator_post(`${path}/${item}`, post);
    }
}

let generator = () => {
    getinfo(async value => {
        let configs = value["config"];
        //console.dir(value, { depth: null });
        const theme_path = `./themes/${configs["setting"]["config"]["theme"]}`;
        tpl.data = value;
        tpl.path = theme_path;
        
        generator_sjs();

        await fs.promises.mkdir(posts_path);
        generator_post(posts_path);
    });
}

generator();

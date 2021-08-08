"use strict"

const fs = require("fs");
const tpl = require("./tpl");
const getinfo = require("./information");
//getinfo(value => { console.dir(value, { depth: null }); });

const output_path = "./output";
const posts_path = "./posts";

let generator_sjs = async (path, add_path, value) => {
    let files = await fs.promises.readdir(path);
    for (let item of files) {
        let npath = `${path}/${item}`;
        if (fs.lstatSync(npath).isDirectory()) {
            generator_sjs(npath, `${add_path}/${item}`, value);
        }
        else {
            fs.promises.writeFile(
                `${output_path}/${add_path}/${item.substr(0, item.lastIndexOf("."))}.html`,
                tpl(await fs.promises.readFile(npath, "utf8"), value));
        }
    }
}

let generator = () => {
    getinfo(async value => {
        let configs = value["config"];
        //console.dir(configs, { depth: null });
        const theme_path = `./themes/${configs["setting"]["config"]["theme"]}`;
        
        generator_sjs(theme_path, "", configs["setting"]);
        
    });
}

generator();
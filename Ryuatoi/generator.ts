import { promises as Fs } from "fs";
import * as Sass from "sass";
import * as Path from "path";
import tpl from "./tpl";
import { getinfo, Info, File, Folder } from "./information";
import { Extend } from "./extend";

const output_path = "./output";

let info = new Info();

let generator = () => {
    getinfo(async value => {
        console.dir(value, { depth: null });
        info = value;
        if (await Extend.File_isExist(output_path)) {
            await Extend.Folder_Remove(output_path);
        }

        await Fs.mkdir(output_path);

        console.log("generator!");

        Extend.render(Path.resolve(Path.join(output_path, "posts")), info.posts);
        Extend.render(Path.resolve(output_path), info.theme);
        Extend.render_after_emit();
    });
}

generator();
import { promises as Fs } from "fs";
import * as Path from "path";
import { getinfo, Info } from "./information";
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

        console.log("To start generating!");

        console.log("To start genderating posts!");
        Extend.render(Path.resolve(Path.join(output_path, "posts")), info.posts);

        console.log("To start genderating theme!");
        Extend.render(Path.resolve(output_path), info.theme);
        console.log("Generate complete");

        console.log("Start Generate_After");
        Extend.render_after_emit();
        console.log("Generate_After complete");

        // console.log(">>> info => ");
        // console.dir(info, { depth: null });
    });
}

generator();
import { promises as Fs } from "fs";
import * as Path from "path";
import { Extend, Tool } from "../../extend";
import { info, config } from "../../information";

const output_path = config.output_path;
Extend.RenderEvent.register("before", async () => {
    if (await Tool.File_isExist(output_path)) {
        await Tool.Folder_Remove(output_path);
    }

    await Fs.mkdir(output_path);
});

Extend.RenderEvent.register("do", async () => {
    console.log("To start generating!");

    console.log("To start genderating posts!");
    await Tool.render(Path.join(output_path, "posts"), info.posts);

    console.log("To start genderating theme!");
    await Tool.render(output_path, info.theme);
    console.log("Generate complete");
});
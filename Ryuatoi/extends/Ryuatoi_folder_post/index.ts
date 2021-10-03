import { Extend, Tool } from "../../extend";
import { File, Folder, info } from "../../information";
import { promises as Fs } from "fs";
import * as Path from "path";
import tpl from "../../tpl";

Extend.Folder.render_register("post", "post", async (output_path: string, value: Folder) => {
    let template: string = await Fs.readFile(Tool.Get_config("Ryuatoi_folder_post")["template_path"], "utf-8");
    let path: string = Path.join(output_path, value[":name"]);
    await Fs.mkdir(path);
    for (let item in value) {
        if (item[0] === ":" || item[0] === ":") continue;
        let v: File | Folder = value[item] as File | Folder;
        if (item === "index" && v[":type"] === "md") {
            await Fs.writeFile(Path.join(path, "index.html"), tpl(template, info.posts_map[v.id], v[":path"]));
        }
        else if (v instanceof File) Tool.render_file(path, v);
        else if (v instanceof Folder) Tool.render(path, v);
    }
});
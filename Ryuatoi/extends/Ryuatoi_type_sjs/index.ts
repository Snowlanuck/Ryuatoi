import { Extend, Tool } from "../../extend";
import tpl from "../../tpl";
import { promises as Fs } from "fs";
import { File, Folder, info, fname, ftype, fdir } from "../../information";
import * as Path from "path";

class SJS {
    type: string = "sjs";
    is_generator: boolean = true;
    content: string = "";
};

Extend.ReadFile["sjs"] = async (path: string, info: Folder) => {
    let [head, value] = Tool.Front_matter(await Fs.readFile(path, "utf-8"));
    let name: string = fname(path);
    let type: string = ftype(path);
    info[name] = Object.assign(new File(name, type, Buffer.from(value), fdir(path)), new SJS(), head);
};

Extend.File.render_register("sjs", "html", async (output_path: string, value: File) => {
    if (!value["is_generator"]) return;
    await Fs.writeFile(
        Path.join(output_path, `${value[":name"]}.html`),
        tpl(Tool.config_parse((value[":value"] as Buffer).toString()), value, value[":path"])
    );
});


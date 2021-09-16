import { Extend } from "../../extend";
import { File, Folder, fname, ftype, config } from "../../information";
import { promises as Fs } from "fs";
import tpl from "../../tpl";
import * as Path from "path";

class Post {
    title: string = "";
    date: string = "";
    tags: string[] = [];
    published: boolean = true;
    hideInList: boolean = false;
    feature: string = "";
    isTop: boolean = false;
    type: string = "";
    content: string = "";
}

Extend.ReadFile["md"] = async (path: string, info: Folder): Promise<void> => {
    let name: string = fname(path);
    let value: Buffer = await Fs.readFile(path);
    let [head, body]: [object, string] = Extend.Front_matter(value.toString());
    info[name] = Object.assign(
        new File(name, ftype(path), value, path),
        new Post(),
        {"content": body},
        head,
    );
};

Extend.File.render_register("md", "html",
    async (output_path: string, value: File) => {
        let config = Extend.Get_config("Ryuatoi_type_md");
        let template = await Fs.readFile(config["template_path"], "utf-8");
        await Fs.writeFile(Path.join(output_path, `${value[":name"]}.html`), tpl(template, value, value[":path"]));
    }
);
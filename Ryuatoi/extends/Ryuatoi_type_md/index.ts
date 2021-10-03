import { Extend, Tool } from "../../extend";
import { File, Folder, fname, ftype, config as Config, info as Info } from "../../information";
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

let posts_cnt = 0;
Extend.ReadFile["md"] = async (path: string, info: Folder): Promise<void> => {
    let name: string = fname(path);
    let type: string = ftype(path);
    let value: Buffer = await Fs.readFile(path);
    let [head, body]: [object, string] = Tool.Front_matter(value.toString());

    info[name] = Object.assign(new File(name, type, null, path), { id: posts_cnt });

    Info.posts_map[posts_cnt] = Object.assign(
        new File(name, ftype(path), value, path),
        new Post(),
        { "content": body },
        head,
    );

    posts_cnt++;
};

Extend.File.render_register("md", "html",
    async (output_path: string, value: File) => {
        let config = Tool.Get_config("Ryuatoi_type_md");
        let template: string = await Fs.readFile(config["template_path"], "utf-8");
        let content: string = tpl(template, Info.posts_map[value.id], value[":path"]);

        let path: string = "";
        if (value[":name"][0] === "+") {
            path = Path.join(output_path, `${value[":name"].substring(1)}.html`);
            await Fs.writeFile(path, content);
        }
        else {
            path = Path.join(output_path, `${value[":name"]}`);
            await Fs.mkdir(path);

            path = Path.join(path, "index.html");
            await Fs.writeFile(path, content);
        }
        
        value.url = Tool.Path2Url(path);
    }
);
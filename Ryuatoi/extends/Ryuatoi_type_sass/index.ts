import { Extend } from "../../extend";
import { File, Folder } from "../../information";
import { promises as Fs } from "fs";
import * as Path from "path";
import * as Sass from "sass";

Extend.File.render_register("sass", "css", async (output_path: string, value: File) => {
    Fs.writeFile(
        Path.join(output_path, `${value[":name"]}.css`),
        Sass.renderSync({ data: (value[":value"] as Buffer).toString() }).css
    );
});
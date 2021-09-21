import { Extend } from "../../extend";
import { info, File, Folder } from "../../information";

Extend.read_after_register(() => {
    let categorys: { [key: string]: number[] } = {};

    (function getCategorys(posts: Folder = info.posts) {
        for (let item in posts) {
            if (item[0] === ":" || item[0] === "_") continue;

            let pi: File | Folder = posts[item] as File | Folder;
            if (pi instanceof Folder) {
                getCategorys(pi);
            }
            else if (pi instanceof File) {
                if (pi[":type"] != "md") continue;
                let id: number = pi.id;
                let post: File = info.posts_map[id];
                if (!("category" in post)) continue;
                if (categorys[post.category] === undefined) {
                    categorys[post.category] = [];
                }
                categorys[post.category].push(id);
            }
        }
    })();

    info.categorys = categorys;
});
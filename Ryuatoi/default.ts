export const post = {
    title: "",
    date: "",
    tags: new Array<string>(),
    published: true,
    hideInList: false,
    feature: "",
    isTop: false,
    type: "article",
    content: ""
};

export const sjs = {
    type: "sjs",
    is_generator: true,
    content: ""
};

export const theme_config = {
    file_template_md: "md.sjs",
    folder_template_book: "book.sjs",
    file_template_book_page: "book_page.sjs",
};

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

class Card {
    constructor(title, author,author_id, media,description,published) {
        this.title = title;
        this.author = author;
        this.author_id = author_id;
        this.media = media;
        this.description=description;
        this.published=published;
    }
}
module.exports.Card = Card;
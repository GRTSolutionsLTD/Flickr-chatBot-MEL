// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { MessageFactory } = require('botbuilder');
const { DialogBot } = require('./dialogBot');

/**
 * RichCardsBot prompts a user to select a Rich Card and then returns the card
 * that matches the user's selection.
 */
class RichCardsBot extends DialogBot {
    constructor(conversationState, userState, dialog) {
        super(conversationState, userState, dialog);
        this.dialogState = this.conversationState.createProperty('DialogState');
        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            for (let cnt = 0; cnt < membersAdded.length; cnt++) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                    const reply = MessageFactory.text('Welcome to CardBot. ' +
                        'This bot will show you  5 cards with pictures. ' +
                        'For each image, you can get a description of this image by clicking the description button' +
                        ' Or get 5 more photos from this photo author');
                    await context.sendActivity(reply);
                    await this.dialog.run(context, this.dialogState);
                }
            }

            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    }
}

module.exports.RichCardsBot = RichCardsBot;

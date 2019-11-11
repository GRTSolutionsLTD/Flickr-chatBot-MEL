const { AttachmentLayoutTypes, CardFactory } = require('botbuilder');
const { ChoicePrompt, ComponentDialog, DialogSet, DialogTurnStatus, WaterfallDialog } = require('botbuilder-dialogs');
const AdaptiveCard = require('../resources/adaptiveCard.json');
const request = require('syncrequest');

const FLICKRURL = 'https://www.flickr.com/services/feeds/photos_public.gne?format=json';
const DESCRIPTION = 'Description';
const AUTHOR_CARDS = 'AuthorCards';
const RESET = 'Reset';
const NO_AUTHOR_CARDS='There is no more cards of this outhor';
const ALL = 'all';
const DESC_OR_MORE = 'descOrMore';
const RESET_OR_MORE = 'resetOrMore';
const NO_IMAGE_TITLE = 'Flickr image';
const NO_IMAGE = "No image";
const NO_IMAGE_AUTHOR = "No author";
const NO_IMAGE_CREATED_DATE = "No created date";
const CARD = 'CARD';
const MAIN_WATERFALL_DIALOG = 'mainWaterfallDialog';
const CARD_PRONPT='cardPrompt';
const BUTTON_PROMPT='buttonPrompt';


class MainDialog extends ComponentDialog {

    constructor(userState) {
        super('MainDialog');
        this.card = userState.createProperty(CARD);
        // Define the main dialog and its related components.
        this.addDialog(new ChoicePrompt(BUTTON_PROMPT));
        this.addDialog(new ChoicePrompt(CARD_PRONPT));
        this.addDialog(new WaterfallDialog(MAIN_WATERFALL_DIALOG, [
            this.showCards.bind(this),
            this.nextDialog.bind(this)
        ]));
        this.addDialog(new WaterfallDialog(DESC_OR_MORE, [
            this.next.bind(this)
        ]));
        this.addDialog(new WaterfallDialog(RESET_OR_MORE, [
            this.chooseResetOrMore.bind(this),
            this.showNextStep.bind(this)
        ]));
        // The initial child Dialog to run.
        this.initialDialogId = MAIN_WATERFALL_DIALOG;
    }


    async run(turnContext, accessor) {
        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);
        const dialogContext = await dialogSet.createContext(turnContext);
        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id);
        }
    }

    async showCards(stepContext) {
        const author = (this.card.author || this.card.author != "") ? this.card.author : null;
        const kind = author == null ? ALL : AUTHOR_CARDS;
        let authorCards = this.getFiveCards(kind);
        if (authorCards) {
            await stepContext.context.sendActivity({
                attachments: authorCards,
                attachmentLayout: AttachmentLayoutTypes.Carousel
            });
        }
        else{
            await stepContext.context.sendActivity(NO_AUTHOR_CARDS);
        }
        return kind == ALL ? { status: DialogTurnStatus.waiting } : await stepContext.replaceDialog(RESET_OR_MORE);
    }

    async nextDialog(stepContext) {
        if (stepContext.context && stepContext.context.activity && stepContext.context.activity.value)
            return await stepContext.replaceDialog(DESC_OR_MORE);
        else
            return await stepContext.replaceDialog(RESET_OR_MORE);
    }

    async  next(stepContext) {
        this.card.author = stepContext.context.activity.value.author;
        this.card.author_id= stepContext.context.activity.value.author_id;
        if (stepContext.context.activity.value.id == DESCRIPTION)
            return this.description(stepContext);
        if (stepContext.context.activity.value.id == AUTHOR_CARDS)
            return await stepContext.replaceDialog(MAIN_WATERFALL_DIALOG);
    }


    async showNextStep(stepContext) {
        if (stepContext.result && stepContext.result.value)
            switch (stepContext.result.value) {
                case AUTHOR_CARDS:
                    const autorCards = this.getFiveCards(AUTHOR_CARDS);
                    if (autorCards) {
                        await stepContext.context.sendActivity({
                            attachments: autorCards,
                            attachmentLayout: AttachmentLayoutTypes.Carousel
                        });
                    }
                    else {
                        await stepContext.context.sendActivity(NO_AUTHOR_CARDS);
                    }
                    return await stepContext.replaceDialog(RESET_OR_MORE);
                case RESET:
                    await stepContext.endDialog();
                    this.card.author = "";
                    return await stepContext.beginDialog(MAIN_WATERFALL_DIALOG);
                default:
                    return { status: DialogTurnStatus.waiting };
            }
    }

    async description(stepContext) {
        await stepContext.context.sendActivity(stepContext.context.activity.value.description);
        return await stepContext.replaceDialog(RESET_OR_MORE);
    }

    getCardsByAuthorName() {
        let authorUrl=(FLICKRURL+'&ids='+this.card.author_id).toString();
        let authorCards = this.getCards(authorUrl);
        if (!authorCards || authorCards.length < 5) {
            console.log(authorCards);
            return authorCards;
        }
        else {
            authorCards = authorCards.slice(0, 5);
            return authorCards;
        }
    }

    async chooseResetOrMore(stepContext) {
        const options = {
            prompt: "What's next? press or choose a number from 1 to 2!",
            retryPrompt: 'That was not a valid choice, please select a card or number from 1 to 2.',
            choices: this.getChoices()
        };
        return await stepContext.prompt('buttonPrompt', options);
    }
    getCards(url) {
        var result = request.sync(url);
        let startIndex = result.body.indexOf('{');
        let lastIndex = result.body.lastIndexOf('}') + 1;
        let resultJsonString = result.body.slice(startIndex, lastIndex);
        let resultJson = JSON.parse(resultJsonString);
        return resultJson.items;
    }

    getFiveCards(cardsKind) {
        let card = JSON.stringify(AdaptiveCard);
        let cards = cardsKind == ALL ? this.getCards(FLICKRURL) : this.getCardsByAuthorName();
        if (cards) {
            let adaptiveCards = [];
            for (let i = 0; i < 5; i++) {
                card = JSON.stringify(AdaptiveCard);
                card = card.replace(/\$title/g, (cards[i].title != " " ? cards[i].title.replace(/"/g, '') : NO_IMAGE_TITLE))
                    .replace(/\$authorName/g, (cards[i].author != " " ? cards[i].author.replace(/"/g, '') : NO_IMAGE_AUTHOR))
                    .replace(/\$author_id/g, cards[i].author_id)
                    .replace(/\$image/g, (cards[i].media.m != " " ? cards[i].media.m : NO_IMAGE))
                    .replace(/\$description/g, (cards[i].description.replace(/"/g, '')))
                    .replace(/\$id_description/g, DESCRIPTION)
                    .replace(/\$id_authotCard/g, AUTHOR_CARDS)
                    .replace(/\$date/g, (cards[i].published != " " ? cards[i].published.replace(/"/g, '') : NO_IMAGE_CREATED_DATE));

                card = JSON.parse(card);
                card = this.createAdaptiveCard(card);
                adaptiveCards.push(card);
            }
            return adaptiveCards;
        }
        else return cards;
    }

    createAdaptiveCard(AdaptiveCard) {
        return CardFactory.adaptiveCard(AdaptiveCard);
    }


    getChoices() {
        const cardOptions = [
            {
                value: AUTHOR_CARDS,
                synonyms: [AUTHOR_CARDS]
            },
            {
                value: RESET,
                synonyms: [RESET]
            },

        ];

        return cardOptions;
    }


}

module.exports.MainDialog = MainDialog;


import { PluginSettings, ParsedSettings } from './interfaces/settings-interface'
import { App } from 'obsidian'
import * as AnkiConnect from './anki'
import { ID_REGEXP_STR } from './note'

function escapeRegex(str: string): string {
    // Got from stackoverflow - https://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript
    return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

export async function settingToData(settings: PluginSettings, app: App): Promise<ParsedSettings> {
    let result: ParsedSettings = <ParsedSettings>{}

    //Some processing required
    result.vault_name = app.vault.getName()
    const note_types: string[] = Object.keys(settings["CUSTOM_REGEXPS"])
    let fields_dict = {}
    for (let note_type of note_types) {
        const field_names: string[] = await AnkiConnect.invoke(
            'modelFieldNames', {modelName: note_type}
        ) as string[]
        fields_dict[note_type] = field_names
    }
    result.fields_dict = fields_dict
    result.custom_regexps = settings.CUSTOM_REGEXPS
    result.template = {
        deckName: settings.Defaults.Deck,
        modelName: "",
        fields: {},
        options: {
            allowDuplicate: false,
            duplicateScope: "deck"
        },
        tags: [settings.Defaults.Tag]
    }
    result.EXISTING_IDS = await AnkiConnect.invoke('findNotes', {query: ""}) as number[]

    //RegExp section
    result.FROZEN_REGEXP = new RegExp(escapeRegex(settings.Syntax["Frozen Fields Line"]) + String.raw` - (.*?):\n((?:[^\n][\n]?)+)`, "g")
    result.DECK_REGEXP = new RegExp(String.raw`^` + escapeRegex(settings.Syntax["Target Deck Line"]) + String.raw`(?:\n|: )(.*)`, "m")
    result.TAG_REGEXP = new RegExp(String.raw`^` + escapeRegex(settings.Syntax["File Tags Line"]) + String.raw`(?:\n|: )(.*)`, "m")
    result.NOTE_REGEXP = new RegExp(String.raw`^` + escapeRegex(settings.Syntax["Begin Note"]) + String.raw`\n([\s\S]*?\n)` + escapeRegex(settings.Syntax["End Note"]), "gm")
    result.INLINE_REGEXP = new RegExp(escapeRegex(settings.Syntax["Begin Inline Note"]) + String.raw`(.*?)` + escapeRegex(settings.Syntax["End Inline Note"]), "g")
    result.EMPTY_REGEXP = new RegExp(escapeRegex(settings.Syntax["Delete Note Line"]) + ID_REGEXP_STR, "g")

    //Just a simple transfer
    result.curly_cloze = settings.Defaults.CurlyCloze
    result.add_file_link = settings.Defaults["Add File Link"]
    result.comment = settings.Defaults["ID Comments"]
    result.regex = settings.Defaults.Regex

    return result
}

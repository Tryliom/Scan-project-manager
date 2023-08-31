import {Command} from "../Command.mjs";

export class Panel extends Command
{
    constructor()
    {
        super("panel", "", 0, "Show a panel to restart and update the bot");

        this.SetOnlyCreator();
    }
}
import {Command} from "../Command.mjs";
import {ScanProjectManager} from "../../../controllers/ScanProjectManager.mjs";

export class Panel extends Command
{
    constructor()
    {
        super("panel", "", 0, "Show a panel to restart and update the bot");

        this.SetOnlyCreator();
    }

    async Run(interaction)
    {

    }
}
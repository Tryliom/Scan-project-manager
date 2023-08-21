export class Logger
{
    static Log(...message)
    {
        console.log(`[${new Date().toLocaleTimeString()}]`, ...message);
    }
}
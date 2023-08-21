export class StringUtility
{
    static CutText(text, maxLength)
    {
        if (text.length > maxLength) return text.substring(0, maxLength - 3) + "...";
        return text;
    }

    static ToUppercaseFirstLetter(text)
    {
        return text.substring(0, 1).toUpperCase() + text.substring(1, text.length);
    }

    static ReplaceAll(str, find, replace)
    {
        for (let i in str)
        {
            str = str.replace(find, replace);
        }

        return str;
    }
}
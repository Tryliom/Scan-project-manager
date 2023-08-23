function PadTo2Digits(num) {
    return num.toString().padStart(2, '0');
}

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

    static FormatDate(date)
    {
        return `${
            [
                date.getFullYear(),
                PadTo2Digits(date.getMonth() + 1),
                PadTo2Digits(date.getDate()),
            ].join('-')
        } ${PadTo2Digits(date.getHours())}h ${PadTo2Digits(date.getMinutes())}min`;
    }
}
import { Platform, Share } from "react-native";

const messageWithoutUrl = (message: string, url: string) =>
  message
    .split(url)
    .join("")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

/**
 * Share text plus one link.
 * iOS share targets append `url`, so the link stays out of `message` there.
 * Android ignores `url`, so the link is included once in `message`.
 */
export const shareMessageWithLink = ({
  message,
  url,
  title,
}: {
  message: string;
  url: string;
  title?: string;
}) => {
  if (Platform.OS === "ios") {
    const text = messageWithoutUrl(message, url);
    return Share.share(text ? { message: text, url, title } : { url, title });
  }

  return Share.share({ message, title });
};

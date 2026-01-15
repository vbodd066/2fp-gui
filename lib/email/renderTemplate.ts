import fs from "fs/promises";
import path from "path";

export async function renderTemplate(
  templateName: string,
  variables: Record<string, string>
): Promise<string> {
  const templatePath = path.join(
    process.cwd(),
    "lib",
    "email",
    "templates",
    templateName
  );

  let content = await fs.readFile(templatePath, "utf8");

  for (const [key, value] of Object.entries(variables)) {
    const pattern = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    content = content.replace(pattern, value);
  }

  return content;
}

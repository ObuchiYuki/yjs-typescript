import { YEventDelta } from "../src/internals";

const jsonToDict = (json: { [s: string]: any }) => {
  return JSON.stringify(json, undefined, 4)
    .replace(/{/g, "[")
    .replace(/}/g, "]")
}
export const deltaToDict = (delta: YEventDelta) => {
  const components: string[] = []
  if (typeof delta.insert == "string") {
    const insert = delta.insert.replace(/\n/g, "\\n")
    components.push(`insert: "${insert}"`) 
  }
  if (delta.retain) components.push(`retain: ${delta.retain}`)  
  if (delta.delete) components.push(`delete: ${delta.delete}`)
  if (delta.attributes) components.push(`attributes: Ref(value: ${jsonToDict(delta.attributes)})`)

  return `YEventDelta(${components.join(", ")})`
}

export const indent = (content: string, size: number): string => {
  const tabs = "    ".repeat(size) 
  return tabs + content.split("\n").join("\n" + tabs)
}

import { deltaToDict, indent } from "./json_to_dict"

export const yTextTestToSwift = (targetTest: Function): string => {

  const lines = targetTest.toString().split("\n")

  let insideDeltaList = false
  let deltaList = ""

  let result = ""

  for (const line of lines) {
    if (line.includes(" = [")) {
      insideDeltaList = true
    }

    if (insideDeltaList) {
      deltaList += line + "\n"
    } else {
      result += line + "\n"
    }

    if (insideDeltaList && line.includes("]")) {
      insideDeltaList = false
      const match = deltaList.match(/const (?<name>\w+) = /)
      const varname = match?.groups?.name ?? ""
      const deltaArray = deltaList.replace(/const .\w+ = /, "")

      const deltaObjectArray = eval(deltaArray)
      const dicts = deltaObjectArray.map((e: any) => deltaToDict(e)).join(",\n") as string
      
      const content = "[\n" + indent(dicts, 2) + "\n    ]" 

      result += `    const ${varname} = ${content}\n` 

      deltaList = ""
    }
  }

  result = result
    .replace(/'/g, "\"")
    .replace(/t.compare/g, "XCTAssertEqual")
    .replace(/t.assert/g, "XCTAssert")
    .replace(/Y\./g, "")
    .replace(/\);/g, ")")
    .replace(/let /g, "var ")
    .replace(/const /g, "let ")
    .replace(/new /g, "")
    .replace(/null/g, "nil")
    .replace(/YEventDelta[]/g, "[YEventDelta]")
    .replace(/[YEventDelta][]/g, "[[YEventDelta]]")
    .replace(/testConnector/g, "connector")

    .replace(/text(\d).insert/g, "try text$1.insert")
    .replace(/text(\d).delete/g, "try text$1.delete")
    .replace(/text(\d).format/g, "try text$1.format")
    .replace(/text(\d).applyDelta/g, "try text$1.applyDelta")
    
    .replace(/connector.flushAllMessages/g, "try connector.flushAllMessages")
    .replace(/\(_?tc\) => {/g, `func ${targetTest.name}() throws {`)
  


  return result

}
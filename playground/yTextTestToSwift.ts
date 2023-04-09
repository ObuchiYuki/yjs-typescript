import { testFormattingDeltaUnnecessaryAttributeChange, testFormattingRemoved, testFormattingRemovedInMidText, testGetDeltaWithEmbeds, testMultilineFormat, testNotMergeEmptyLinesFormat, testPreserveAttributesThroughDelete, testSnapshot, testSnapshotDeleteAfter, testToDeltaEmbedAttributes, testToDeltaEmbedNoAttributes, testToJson, testTypesAsEmbed } from "../tests/cases/y-text.tests"
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

    .replace(/{ insert: (.+) }/g, "YEventDelta(insert: $1)")
    .replace(/{ retain: (\d+) }/g, "YEventDelta(retain: $1)")
    .replace(/{ delete: (\d+) }/g, "YEventDelta(delete: $1)")

    .replace(/{ (\w+): ([\w"]+) }/g, "[\"$1\": $2]")

    .replace(/\n    \]\)/g, ",\n    ])")

    .replace(/{ insert: (.+) }/g, "YEventDelta(insert: $1)")
    .replace(/{ retain: (.+) }/g, "YEventDelta(retain: $1)")
    .replace(/{ delete: (.+) }/g, "YEventDelta(delete: $1)")
    
    .replace(/connector.flushAllMessages/g, "try connector.flushAllMessages")
    .replace(/\(_?tc\) => {/g, `func ${targetTest.name}() throws {`)
  
  
  
    const match = result.match(/let { (.+?) } = init\(tc, \["users": (\d+)\]\)/)
    
    if (match != null) {
      let testInit = `let test = try YTest<Any>(docs: ${match[2]})\n`

      const components = match[1].split(" ")
      let docs = false
      let connector = false
      let text: number[] = []
      for (const component of components) {
        if (component == "users") docs = true
        if (component == "connector") connector = true
        if (component.startsWith("text")) {
          const id = parseInt(component.replace("text", ""))
          text.push(id)
        }
      }

      let initComponents: string[] = []

      if (docs) {
        initComponents.push("docs = test.docs")
      }
      if (connector) {
        initComponents.push("connector = test.connector")
      }
      if (text.length) {
        for (const i of text) {
          initComponents.push(`text${i} = test.text[${i}]`)
        }
      }

      if (initComponents.length) {
        testInit += `    let ${initComponents.join(", ")}\n`
      }


      result = result.replace(match[0], testInit)
    }
    
  return result + "\n"
}

console.log(yTextTestToSwift(testToDeltaEmbedNoAttributes))
console.log(yTextTestToSwift(testFormattingRemoved))
console.log(yTextTestToSwift(testFormattingRemovedInMidText))
console.log(yTextTestToSwift(testFormattingDeltaUnnecessaryAttributeChange))
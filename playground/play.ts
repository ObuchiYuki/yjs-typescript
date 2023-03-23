import { testBasicFormat, testBasicInsertAndDelete, testDeltaAfterConcurrentFormatting, testDeltaBug2 } from '../tests/cases/y-text.tests'
import { yTextTestToSwift } from './yTextTestToSwift'

console.log(yTextTestToSwift(testBasicFormat)) 
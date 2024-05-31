import { MacroedText, MacroedTextPart, MacroedTextPartType } from "../../src/renderer/lib/http/Macro";
import { hrtime } from "process";

function testMttParsing(testName: string, inputString: string, condensedOutput: [ Array<string>, Array<number> ]): void {
    test(testName, () => {
        let parseOutput: MacroedText = null;

        if (condensedOutput[0].length != condensedOutput[1].length) {
            throw new Error("Output not properly specified. There are different number of parts and types.");
        }

        let expectedOutput: Array<MacroedTextPart> = [];

        condensedOutput[0].forEach((_, i) => {
            expectedOutput.push({
                text: condensedOutput[0][i],
                type: condensedOutput[1][i]
            });
        });

        let startDT = hrtime.bigint();
        parseOutput = MacroedText.parse(inputString, true);
        let endDT = hrtime.bigint();
        const parseDuration = endDT - startDT;

        expect(parseOutput.getParts()).toEqual(expectedOutput);
        expect(parseDuration).toBeLessThan(1000000); // 1000000 nanoseconds = 1ms
    });
}

const PARAM = MacroedTextPartType.Parameter;
const PLAIN = MacroedTextPartType.PlainText;
const EQ    = MacroedTextPartType.EqualityChar;

testMttParsing("1", "some string ${PARAMETER} some other string", [
    [ "some string ", "${PARAMETER}", " some other string" ],
    [ PLAIN,          PARAM,          PLAIN ]
]);

testMttParsing("2", "some string ${PARAMETER_1} some ${PARAMETER_2} other string", [
    [ "some string ", "${PARAMETER_1}", " some ", "${PARAMETER_2}", " other string" ],
    [ PLAIN,          PARAM,            PLAIN,    PARAM,            PLAIN ]
]);

testMttParsing("3", "some string ${PARAMETER_1}${PARAMETER_2} other string", [
    [ "some string ", "${PARAMETER_1}", "${PARAMETER_2}", " other string" ],
    [ PLAIN,          PARAM,            PARAM,            PLAIN ]
]);

testMttParsing("4", "${PARAMETER_1} blabla ${PARAMETER_2}", [
    [ "${PARAMETER_1}", " blabla ", "${PARAMETER_2}" ],
    [ PARAM,            PLAIN,      PARAM ]
]);

testMttParsing("5", "${PARAMETER_1} blabla ${PARAMETER_2", [
    [ "${PARAMETER_1}", " blabla ", "${PARAMETER_2" ],
    [ PARAM,            PLAIN,      PARAM ]
]);

testMttParsing("6", "${PARAMETER_1 blabla ${PARAMETER_2", [
    [ "${PARAMETER_1 blabla ${PARAMETER_2"],
    [ PARAM ]
]);

testMttParsing("7", "somthing} ${PARAMETER_1 blabla ${PARAMETER_2} bla } ble", [
    [ "somthing} ", "${PARAMETER_1 blabla ${PARAMETER_2}", " bla } ble"],
    [ PLAIN,        PARAM,                                 PLAIN ]
]);

testMttParsing("0e11", "a", [
    [ "a"   ],
    [ PLAIN ]
]);

testMttParsing("0e12", "a=", [
    [ "a", "="  ],
    [ PLAIN, EQ ]
]);

testMttParsing("0e13", "=a", [
    [ "=", "a"  ],
    [ EQ, PLAIN ]
]);

testMttParsing("0e13", "=", [
    [ "=" ],
    [ EQ  ]
]);

testMttParsing("0e21", "am=", [
    [ "am", "=" ],
    [ PLAIN, EQ ]
]);

testMttParsing("0e22", "=am", [
    [ "=", "am"  ],
    [ EQ,  PLAIN ]
]);

testMttParsing("0e23", "a=m", [
    [ "a", "=", "m" ],
    [ PLAIN, EQ, PLAIN ]
]);

testMttParsing("0e24", "am", [
    [ "am"  ],
    [ PLAIN ]
]);

testMttParsing("0e31", "amj", [
    [ "amj" ],
    [ PLAIN ]
]);

testMttParsing("0e32", "=amj", [
    [ "=", "amj" ],
    [ EQ,  PLAIN ]
]);

testMttParsing("0e33", "a=mj", [
    [ "a", "=", "mj" ],
    [ PLAIN, EQ, PLAIN ]
]);

testMttParsing("0e34", "am=j", [
    [ "am", "=", "j" ],
    [ PLAIN, EQ, PLAIN ]
]);

testMttParsing("0e35", "amj=", [
    [ "amj", "=" ],
    [ PLAIN, EQ ]
]);

testMttParsing("0e4", "somes=tring", [
    [ "somes", "=", "tring"],
    [ PLAIN,   EQ,  PLAIN  ]
]);

testMttParsing("0e51", "somes=$", [
    [ "somes", "=", "$"],
    [ PLAIN,   EQ,  PLAIN  ]
]);

testMttParsing("0e52", "somes=${", [
    [ "somes", "=", "${"],
    [ PLAIN,   EQ,  PARAM  ]
]);

testMttParsing("1e1", "some str=ing ${PARAMETER} some other string", [
    [ "some str", "=", "ing ", "${PARAMETER}", " some other string" ],
    [ PLAIN,      EQ,  PLAIN,  PARAM,          PLAIN ]
]);

testMttParsing("1e2", "some string ${PARA=METER} some other string", [
    [ "some string ", "${PARA=METER}", " some other string" ],
    [ PLAIN,          PARAM,           PLAIN ]
]);

testMttParsing("1e3", "some string ${=PARAMETER} some other string", [
    [ "some string ", "${=PARAMETER}", " some other string" ],
    [ PLAIN,          PARAM,          PLAIN ]
]);

testMttParsing("1e4", "some string ${PARAMETER=} some other string", [
    [ "some string ", "${PARAMETER=}", " some other string" ],
    [ PLAIN,          PARAM,           PLAIN ]
]);

testMttParsing("1e5", "some string =${PARAMETER} some other string", [
    [ "some string ", "=", "${PARAMETER}", " some other string" ],
    [ PLAIN,          EQ,  PARAM,          PLAIN ]
]);

testMttParsing("1e6", "some string ${PARAMETER}= some other string", [
    [ "some string ", "${PARAMETER}", "=", " some other string" ],
    [ PLAIN,          PARAM,          EQ,  PLAIN ]
]);

testMttParsing("1e7", "=some string ${PARAMETER} some other string", [
    [ "=", "some string ", "${PARAMETER}", " some other string" ],
    [ EQ,  PLAIN,          PARAM,          PLAIN ]
]);

testMttParsing("1e8", "some string ${PARAMETER} some other string=", [
    [ "some string ", "${PARAMETER}", " some other string", "=" ],
    [ PLAIN,          PARAM,          PLAIN,                EQ ]
]);

testMttParsing("1e8", "so=me strin=g ${PARAMETER} some other str=ing", [
    [ "so", "=", "me strin=g ", "${PARAMETER}", " some other str=ing"],
    [ PLAIN, EQ, PLAIN,         PARAM,          PLAIN                ]
]);

testMttParsing("2e", "some string ${PARAMETER_1} some =${PARAMETER_2} other string", [
    [ "some string ", "${PARAMETER_1}", " some ", "=", "${PARAMETER_2}", " other string" ],
    [ PLAIN,          PARAM,            PLAIN,    EQ,  PARAM,            PLAIN ]
]);

testMttParsing("3e1", "some = string ${PARAMETER_1}${PARAMETER_2} other string", [
    [ "some ", "=", " string ", "${PARAMETER_1}", "${PARAMETER_2}", " other string" ],
    [ PLAIN,   EQ,  PLAIN,      PARAM,            PARAM,            PLAIN ]
]);

testMttParsing("3e2", "some string ${PARAMETER_1}=${PARAMETER_2} other string", [
    [ "some string ", "${PARAMETER_1}", "=", "${PARAMETER_2}", " other string" ],
    [ PLAIN,          PARAM,            EQ,  PARAM,            PLAIN ]
]);

testMttParsing("4e", "${PARAMETER_1}= blabla ${PARAMETER_2}", [
    [ "${PARAMETER_1}", "=", " blabla ", "${PARAMETER_2}" ],
    [ PARAM,            EQ,  PLAIN,      PARAM ]
]);

testMttParsing("5e", "${PARAM=ETER_1} bla=bla ${PAR=AMETER_2", [
    [ "${PARAM=ETER_1}", " bla", "=", "bla ", "${PAR=AMETER_2" ],
    [ PARAM,             PLAIN,  EQ,  PLAIN,  PARAM ]
]);

testMttParsing("6e", "${PARAMETER_1 bla=bla ${PARAMETER_2", [
    [ "${PARAMETER_1 bla=bla ${PARAMETER_2"],
    [ PARAM ]
]);

testMttParsing("7e", "something=} ${PARAMETER_1 blabla ${PARAMETER_2} bla } ble", [
    [ "something", "=", "} ",  "${PARAMETER_1 blabla ${PARAMETER_2}", " bla } ble"],
    [ PLAIN,       EQ,  PLAIN, PARAM,                                 PLAIN ]
]);

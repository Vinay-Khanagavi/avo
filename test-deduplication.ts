import { cleanHallucinatedContent, deduplicateTranscript } from './lib/transcript-deduplication';

console.log("Running Deduplication Tests...\n");

// Test 1: Hallucination Cleaning
const hallucinationInput = "This is a real sentence. Thank you.";
const cleaned = cleanHallucinatedContent(hallucinationInput);
console.log(`Test 1 (Hallucination): "${hallucinationInput}" -> "${cleaned}"`);
// "Thank you" should be removed, period stays
if (cleaned === "This is a real sentence.") console.log("PASS"); else console.log("FAIL");

// Test 2: Simple Overlap
const existing1 = "Hello world this is";
const new1 = "world this is a test";
const result1 = deduplicateTranscript(existing1, new1, "test1");
console.log(`\nTest 2 (Overlap): "${existing1}" + "${new1}" -> "${result1.transcript}"`);
if (result1.transcript === "Hello world this is a test") console.log("PASS"); else console.log("FAIL");

// Test 3: Repetition (Subset)
const existing2 = "Hello world this is a test";
const new2 = "this is a test";
const result2 = deduplicateTranscript(existing2, new2, "test2");
console.log(`\nTest 3 (Repetition): "${existing2}" + "${new2}" -> "${result2.transcript}"`);
if (result2.transcript === "Hello world this is a test") console.log("PASS"); else console.log("FAIL");

// Test 4: No Overlap
const existing3 = "Hello world";
const new3 = "This is new";
const result3 = deduplicateTranscript(existing3, new3, "test3");
console.log(`\nTest 4 (No Overlap): "${existing3}" + "${new3}" -> "${result3.transcript}"`);
if (result3.transcript === "Hello world This is new") console.log("PASS"); else console.log("FAIL");

// Test 5: Hallucination (Short repetition)
const existing4 = "This is a very long sentence that should not be repeated.";
const new4 = "This is a very";
const result4 = deduplicateTranscript(existing4, new4, "test4");
console.log(`\nTest 5 (Short Repetition): "${existing4}" + "${new4}" -> "${result4.transcript}"`);
if (result4.transcript === "This is a very long sentence that should not be repeated.") console.log("PASS"); else console.log("FAIL");

// Test 6: User's scenario - Phrase repetition at start
const existing5 = "Hey this is Kai and I'm testing how good this platform works.";
const new5 = "Hey this is Kai and I'm testing how good this platform works. This is the last chance.";
const result5 = deduplicateTranscript(existing5, new5, "test5");
console.log(`\nTest 6 (User Scenario - Continuation): "${existing5}" + "${new5}" -> "${result5.transcript}"`);
console.log(`Incremental: "${result5.incremental}"`);
if (result5.incremental === "This is the last chance.") console.log("PASS"); else console.log("FAIL");

// Test 7: User's scenario - Complete hallucination (re-transcription of same phrase)
const existing6 = "Hey this is Kai and I'm testing how good this platform works.";
const new6 = "Hey this is Kai and I'm testing";
const result6 = deduplicateTranscript(existing6, new6, "test6");
console.log(`\nTest 7 (User Scenario - Hallucination): "${existing6}" + "${new6}" -> "${result6.transcript}"`);
console.log(`Incremental: "${result6.incremental}"`);
if (result6.incremental === "") console.log("PASS"); else console.log("FAIL");

// Test 8: Different sentences should not be duplicated
const existing7 = "The quick brown fox jumps over the lazy dog.";
const new7 = "Now is the time for all good men to come to the aid of their country.";
const result7 = deduplicateTranscript(existing7, new7, "test7");
console.log(`\nTest 8 (Different Sentences): Should append both sentences`);
console.log(`Result: "${result7.transcript}"`);
const expected7 = "The quick brown fox jumps over the lazy dog. Now is the time for all good men to come to the aid of their country.";
if (result7.transcript === expected7) console.log("PASS"); else console.log("FAIL");

console.log("\n" + "=".repeat(50));
console.log("All tests completed!");

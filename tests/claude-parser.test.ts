import { extractBashCommands, parseClaudeResponse, reconstructResponse, ParsedCommand } from "../src/handlers/claude-parser";

describe("claude-parser", () => {
  describe("extractBashCommands", () => {
    it("should extract bash commands from code blocks", () => {
      const response = `
Here's how to create a branch:

\`\`\`bash
git checkout -b new-feature
git push -u origin new-feature
\`\`\`

This will create and push the branch.
      `;

      const commands = extractBashCommands(response);
      expect(commands).toEqual(["git checkout -b new-feature", "git push -u origin new-feature"]);
    });

    it("should extract commands from sh code blocks", () => {
      const response = `
\`\`\`sh
echo "Hello"
ls -la
\`\`\`
      `;

      const commands = extractBashCommands(response);
      expect(commands).toEqual(['echo "Hello"', "ls -la"]);
    });

    it("should extract commands from unlabeled blocks that look like commands", () => {
      const response = `
\`\`\`
git status
git add .
git commit -m 'test'
\`\`\`
      `;

      const commands = extractBashCommands(response);
      expect(commands).toEqual(["git status", "git add .", "git commit -m 'test'"]);
    });

    it("should ignore comments in bash blocks", () => {
      const response = `
\`\`\`bash
# This is a comment
git status
# Another comment
git branch
\`\`\`
      `;

      const commands = extractBashCommands(response);
      expect(commands).toEqual(["git status", "git branch"]);
    });

    it("should not extract from non-bash code blocks", () => {
      const response = `
\`\`\`javascript
console.log("Hello");
\`\`\`

\`\`\`python
print("Hello")
\`\`\`
      `;

      const commands = extractBashCommands(response);
      expect(commands).toEqual([]);
    });
  });

  describe("parseClaudeResponse", () => {
    it("should parse mixed content correctly", () => {
      const response = `
Here's the solution:

\`\`\`bash
git checkout -b feature
\`\`\`

And here's some JavaScript:

\`\`\`javascript
console.log("test");
\`\`\`

Done!
      `;

      const parsed = parseClaudeResponse(response);

      expect(parsed).toHaveLength(5);
      expect(parsed[0].type).toBe("text");
      expect(parsed[0].content).toContain("Here's the solution:");

      expect(parsed[1].type).toBe("bash");
      expect(parsed[1].content).toBe("git checkout -b feature\n");

      expect(parsed[2].type).toBe("text");
      expect(parsed[2].content).toContain("And here's some JavaScript:");

      expect(parsed[3].type).toBe("text");
      expect(parsed[3].content).toContain("console.log");

      expect(parsed[4].type).toBe("text");
      expect(parsed[4].content).toBe("Done!");
    });
  });

  describe("reconstructResponse", () => {
    it("should reconstruct response with execution results", () => {
      const parsed: ParsedCommand[] = [
        { type: "text", content: "Creating branch:" },
        { type: "bash", content: "git branch test", language: "bash" },
      ];

      const results = new Map([["git branch test", { success: true, output: "Branch created" }]]);

      const reconstructed = reconstructResponse(parsed, results);

      expect(reconstructed).toContain("Creating branch:");
      expect(reconstructed).toContain("✅ `git branch test`");
      expect(reconstructed).toContain("Branch created");
    });

    it("should show errors for failed commands", () => {
      const parsed: ParsedCommand[] = [{ type: "bash", content: "git push", language: "bash" }];

      const results = new Map([["git push", { success: false, error: "Permission denied" }]]);

      const reconstructed = reconstructResponse(parsed, results);

      expect(reconstructed).toContain("❌ `git push`");
      expect(reconstructed).toContain("Permission denied");
    });

    it("should mark unexecuted commands", () => {
      const parsed: ParsedCommand[] = [{ type: "bash", content: "git status", language: "bash" }];

      const results = new Map(); // Empty results

      const reconstructed = reconstructResponse(parsed, results);

      expect(reconstructed).toContain("`git status` (not executed)");
    });
  });
});

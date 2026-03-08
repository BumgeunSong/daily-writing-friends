export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Daily Writing Friends MCP Server</h1>
      <p>This is an MCP server for AI assistants to read DailyWritingFriends posts.</p>
      <h2>Connect</h2>
      <ul>
        <li><strong>Claude Desktop:</strong> Add this server URL to your MCP config</li>
        <li><strong>ChatGPT:</strong> Add as a Connector in Settings &gt; Developer Mode</li>
      </ul>
      <p>
        Endpoint: <code>/api/mcp</code>
      </p>
    </main>
  );
}

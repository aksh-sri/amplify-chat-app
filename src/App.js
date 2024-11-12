import React, { useState, useEffect } from 'react';
import { Amplify, API, graphqlOperation, Storage } from 'aws-amplify';
import { createMessage } from './graphql/mutations';
import { onCreateMessage } from './graphql/subscriptions';
import { listMessages } from './graphql/queries';
import { withAuthenticator } from '@aws-amplify/ui-react';
import { Document, Page } from 'react-pdf';
import { v4 as uuidv4 } from 'uuid';
import awsconfig from './aws-exports';
import './App.css';

Amplify.configure(awsconfig);

function App() {
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentUrl, setDocumentUrl] = useState(null);

  useEffect(() => {
    fetchMessages();
    const subscription = API.graphql(graphqlOperation(onCreateMessage)).subscribe({
      next: ({ value }) => {
        setMessages(prevMessages => [...prevMessages, value.data.onCreateMessage]);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function fetchMessages() {
    const messageData = await API.graphql(graphqlOperation(listMessages));
    setMessages(messageData.data.listMessages.items);
  }

  async function handleSendMessage() {
    if (!messageText) return;
    const message = { content: messageText, createdAt: new Date().toISOString() };
    await API.graphql(graphqlOperation(createMessage, { input: message }));
    setMessageText('');
  }

  async function handleFileUpload(event) {
    const file = event.target.files[0];
    const fileName = `${uuidv4()}-${file.name}`;
    await Storage.put(fileName, file);
    const url = await Storage.get(fileName);
    setDocumentUrl(url);
    setSelectedFile(file.name);
  }

  return (
    <div className="App">
      <h1>Amplify Chat App</h1>
      <div className="chat-container">
        {messages.map(message => (
          <div key={message.id} className="message">
            {message.content}
          </div>
        ))}
      </div>
      <input
        type="text"
        value={messageText}
        onChange={e => setMessageText(e.target.value)}
        placeholder="Type a message"
      />
      <button onClick={handleSendMessage}>Send</button>
      <input type="file" onChange={handleFileUpload} />
      {selectedFile && <p>Selected file: {selectedFile}</p>}
      {documentUrl && (
        <div className="document-viewer">
          <h2>Document Viewer</h2>
          <Document file={documentUrl}>
            <Page pageNumber={1} />
          </Document>
        </div>
      )}
    </div>
  );
}

export default withAuthenticator(App);
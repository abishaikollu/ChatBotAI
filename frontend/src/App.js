import React, { useState } from 'react';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [files, setFiles] = useState([]); 


  const sendMessage = async () => {
    const userMessage = userInput.trim();
    if (userMessage) {
      setMessages(messages => [...messages, { sender: 'User', text: userMessage }]);
      setUserInput('');

      try {
        const response = await fetch('http://localhost:5000/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ message: userMessage })
        });

        const data = await response.json();
        if (data.reply) {
          setMessages(messages => [...messages, { sender: 'AI', text: data.reply }]);
        }
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };

  const uploadPDF = async () => {
    if (files.length > 0) {
      const formData = new FormData();
      files.forEach((file, index) => {
        formData.append(`pdfs[${index}]`, file); 
      });

      try {
        const response = await fetch('http://localhost:5000/upload', {
          method: 'POST',
          body: formData
        });

        const data = await response.text();
        alert(data); 
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };

  return (
    <div className="App">
      <header className="App-header">
      <h2>CHATBOT</h2>
        <div className="chat-box">
          {messages.map((message, index) => (
            <div key={index} className={`message ${message.sender}`}>
              {message.text}
            </div>
          ))}
        </div>
        <input
          type="text"
          value={userInput}
          onChange={e => setUserInput(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && sendMessage()}
        />
        <button onClick={sendMessage}>Send</button>
        <div>
        <input type="file" onChange={e => setFiles([...e.target.files])} accept=".pdf" multiple/>
          <button onClick={uploadPDF}>Upload PDF</button>
        </div>
      </header>
    </div>
  );
}

export default App;

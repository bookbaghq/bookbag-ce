# User Guide

Complete guide to using BookBag for end users.

## Table of Contents

- [Getting Started](#getting-started)
- [User Management](#user-management)
- [Workspaces](#workspaces)
- [Chat Interface](#chat-interface)
- [Model Selection](#model-selection)
- [RAG Documents](#rag-documents)
- [Media & Attachments](#media--attachments)
- [Settings & Preferences](#settings--preferences)
- [Tips & Best Practices](#tips--best-practices)

## Getting Started

### First Login

1. **Navigate to BookBag**
   - Open your browser and go to your BookBag instance (e.g., http://localhost:3000)

2. **Login or Create Account**
   - If you have credentials, log in
   - If you're the first user, you'll become an administrator
   - Default credentials (if configured): `admin@bookbag.work` / `admin`

3. **Change Your Password**
   - Go to your profile settings
   - Update your password immediately

### Dashboard Overview

After logging in, you'll see the main dashboard:

- **Sidebar Navigation**: Access chats, workspaces, RAG documents, and admin features
- **Main Content Area**: Displays your current view (chats, settings, etc.)
- **User Menu**: Access profile, settings, and logout

## User Management

### Your Profile

**Access:** Click your profile icon → Profile Settings

**Available Options:**
- Update display name
- Change email address
- Change password
- View your role (Administrator or Subscriber)
- See account creation date

### Changing Password

1. Navigate to Profile Settings
2. Click "Change Password"
3. Enter current password
4. Enter new password (minimum 8 characters)
5. Confirm new password
6. Click "Update Password"

## Workspaces

Workspaces organize conversations and documents by project or team.

### Viewing Workspaces

**Access:** Sidebar → Workspaces

You'll see:
- All workspaces you're a member of
- Your role in each workspace (Admin or Member)
- Number of members and available models

### Joining a Workspace

Workspace administrators must invite you. You'll receive:
- Email notification (if configured)
- Invitation appears in your dashboard

To accept:
1. Click the invitation link
2. Review workspace details
3. Click "Join Workspace"

### Creating a Workspace

**Administrators Only**

1. Navigate to Admin → Workspaces
2. Click "Create Workspace"
3. Enter:
   - Workspace Name
   - Description (optional)
4. Click "Create"
5. Add members and assign models

### Workspace Settings

**Workspace Admins Only**

**Access:** Workspace → Settings

Available settings:
- **Basic Info**: Name, description
- **Members**: Add/remove users, change roles
- **Models**: Assign which models the workspace can use
- **Documents**: Workspace-level RAG documents

#### Adding Members

1. Go to Workspace Settings → Members
2. Click "Add Member"
3. Search for user by email or name
4. Select role (Admin or Member)
5. Click "Add"

#### Assigning Models

1. Go to Workspace Settings → Models
2. View available models
3. Toggle models on/off for this workspace
4. Only enabled models will appear in workspace chats

### Leaving a Workspace

1. Navigate to Workspace Settings
2. Click "Leave Workspace"
3. Confirm action
4. You'll lose access to all workspace chats and documents

## Chat Interface

The chat interface is where you interact with AI models.

### Creating a Chat

**Option 1: Quick Chat**
1. Click "New Chat" in sidebar
2. Select a model (if not in workspace)
3. Start typing your message

**Option 2: Workspace Chat**
1. Navigate to a workspace
2. Click "New Chat"
3. Chat inherits workspace models and documents

### Chat Interface Components

**Message Input:**
- Type your message in the text area
- Press Enter to send (Shift+Enter for new line)
- Click paperclip icon to attach files

**Model Selector:**
- Dropdown shows available models
- Switch models mid-conversation
- Model capabilities displayed (vision, generation, etc.)

**Chat History:**
- Scroll to view previous messages
- Messages show timestamp and token usage
- Copy message text with copy button

**Actions Menu:**
- Archive chat
- Delete chat
- Share chat (if permissions allow)
- View chat settings

### Sending Messages

1. **Text Messages:**
   - Type your question or instruction
   - Click "Send" or press Enter

2. **With Attachments:**
   - Click paperclip icon
   - Select image (if model supports vision)
   - Add your text prompt
   - Click "Send"

3. **With RAG Context:**
   - Upload documents first (see RAG section)
   - Documents automatically used as context
   - Model responses cite relevant documents

### Message Features

**Thinking Sections:**
Some models (like Claude) show "thinking" before responding:
- Expand/collapse thinking section
- See model's reasoning process
- Helpful for understanding responses

**Code Blocks:**
- Syntax highlighting for code
- Copy button for easy copying
- Language detection automatic

**Token Usage:**
Each message shows:
- Input tokens (your message)
- Output tokens (model response)
- Total tokens for this exchange

### Managing Chats

**Archiving:**
1. Open chat actions menu
2. Click "Archive"
3. Chat moves to archived view
4. Unarchive anytime from archive view

**Deleting:**
1. Open chat actions menu
2. Click "Delete"
3. Confirm deletion
4. Chat is soft-deleted (admin can recover)

**Searching:**
1. Use search bar in chat sidebar
2. Enter keywords from chat title or messages
3. Results filter in real-time

**Favorites:**
1. Click star icon on chat
2. Chat appears in "Favorites" section
3. Quick access to important chats

## Model Selection

### Available Models

**Access:** Models are configured by administrators

You'll see models based on:
- System-wide published models
- Workspace-assigned models (in workspace chats)
- Your permissions

### Model Information

Hover over model name to see:
- **Provider**: OpenAI, Anthropic, Grok, etc.
- **Capabilities**: Text, vision, image generation
- **Context Window**: Maximum tokens
- **Cost**: Approximate cost per 1M tokens

### Switching Models

**In Active Chat:**
1. Click model dropdown
2. Select different model
3. Conversation continues with new model
4. Previous messages remain visible

**Note:** Each message remembers which model generated it.

### Model Capabilities

**Text Models:**
- Standard conversational AI
- Code generation and explanation
- Data analysis and reasoning

**Vision Models:**
- Analyze images
- Extract text from images
- Describe visual content
- Answer questions about images

**Image Generation Models:**
- Create images from text descriptions
- Controlled by admin settings

## RAG Documents

RAG (Retrieval-Augmented Generation) allows AI to use your documents as context.

### Document Types Supported

- PDF (.pdf)
- Word Documents (.docx)
- Text Files (.txt)
- CSV Files (.csv)

### Uploading Documents

**Personal Documents (Chat-Level):**
1. Open a chat
2. Click "Documents" tab
3. Click "Upload Document"
4. Select file(s)
5. Wait for processing
6. Documents available immediately

**Workspace Documents:**
1. Navigate to workspace
2. Go to Documents section
3. Click "Upload Document"
4. Select file(s)
5. Documents available to all workspace members

### Document Processing

After upload:
1. **Text Extraction**: Content extracted from file
2. **Chunking**: Text split into searchable chunks
3. **Embedding**: Chunks converted to vectors
4. **Indexing**: Made searchable for retrieval

**Processing Time:**
- Small documents (< 10 pages): seconds
- Medium documents (10-100 pages): 1-2 minutes
- Large documents (> 100 pages): several minutes

### Using Documents in Chats

**Automatic Retrieval:**
- When you send a message, relevant document chunks are automatically found
- Model receives both your message and relevant context
- Responses cite which documents were used

**Manual Reference:**
- Mention document name in your message
- Ask specific questions about documents
- Request comparisons between documents

**Example Prompts:**
- "Based on the Q2 report, what were our key findings?"
- "Compare the pricing in contract-a.pdf and contract-b.pdf"
- "Summarize the meeting notes from last week"

### Managing Documents

**Viewing Documents:**
- Navigate to Documents section
- See all uploaded documents
- View metadata (filename, size, upload date)

**Deleting Documents:**
1. Find document in list
2. Click delete icon
3. Confirm deletion
4. Document and all chunks removed

**Permissions:**
- Chat documents: Only you (or chat participants)
- Workspace documents: All workspace members
- Admin documents: System-wide (admin only)

### RAG Settings

**Administrators configure:**
- Enable/disable RAG globally
- Enable/disable for specific features
- Grounding mode (strict vs soft)
- Chunk size and overlap
- Number of retrieved chunks

**Grounding Modes:**
- **Strict**: Model only uses document context (no general knowledge)
- **Soft**: Model uses documents + general knowledge

## Media & Attachments

### Uploading Images

**Vision Analysis:**
1. Click paperclip icon in chat
2. Select image file (JPG, PNG, WEBP)
3. Add your question about the image
4. Send message
5. Model analyzes and responds

**Example Prompts:**
- "What's in this image?"
- "Extract the text from this screenshot"
- "Describe the chart and explain the trends"
- "What color palette is used in this design?"

### Supported Image Formats

- JPEG (.jpg, .jpeg)
- PNG (.png)
- WebP (.webp)
- GIF (.gif) - first frame only

### Image Size Limits

- Maximum file size: Configured by admin (typically 10MB)
- Automatically resized if needed
- Maintains aspect ratio

### Generated Images

Some models can generate images:
1. Type a description: "Create an image of..."
2. Model generates image
3. Image appears in chat
4. Can be downloaded or referenced

## Settings & Preferences

### User Preferences

**Access:** Profile → Settings

**Available Settings:**
- Display name
- Email address
- Password
- Notification preferences (if configured)
- Language preference (future feature)

### Notification Settings

Configure notifications for:
- New workspace invitations
- Mentions in shared chats
- Document processing complete
- System announcements

### Privacy Settings

Control:
- Who can see your profile
- Who can invite you to workspaces
- Data retention preferences

## Tips & Best Practices

### Effective Prompting

**Be Specific:**
- ✅ "Summarize the Q2 financial report focusing on revenue growth"
- ❌ "Tell me about the report"

**Provide Context:**
- ✅ "I'm a software engineer. Explain REST APIs like I know databases but not web development"
- ❌ "What are REST APIs?"

**Break Down Complex Tasks:**
- ✅ Ask step-by-step questions
- ❌ Try to solve everything in one message

**Use Examples:**
- ✅ "Write a function like this example: [example]"
- ❌ "Write a function"

### Working with Documents

**Organize by Topic:**
- Create separate workspaces for different projects
- Use descriptive document names
- Remove outdated documents

**Size Considerations:**
- Split very large documents into smaller files
- Better: "chapter-1.pdf", "chapter-2.pdf"
- Worse: "entire-book-1000-pages.pdf"

**Keep Documents Current:**
- Upload latest versions
- Delete outdated versions
- Update regularly for accurate context

### Managing Tokens & Costs

**Monitor Usage:**
- Check token counts per message
- Review chat-level analytics
- Identify high-usage patterns

**Optimize Prompts:**
- Be concise but specific
- Avoid repeating context
- Use documents instead of pasting content

**Choose Appropriate Models:**
- Use smaller models for simple tasks
- Reserve larger models for complex reasoning
- Check cost per model before selecting

### Collaboration in Workspaces

**Share Knowledge:**
- Upload relevant documents to workspace
- Create shared chats for team discussions
- Document important findings

**Respect Permissions:**
- Only workspace admins should manage settings
- Ask before uploading large documents
- Clean up old chats periodically

**Communicate Effectively:**
- Use descriptive chat names
- Archive completed projects
- Share useful prompts with team

### Security Best Practices

**Protect Credentials:**
- Use strong, unique passwords
- Change default passwords immediately
- Never share your account

**Sensitive Data:**
- Be cautious with confidential information
- Understand your organization's data policy
- Use appropriate workspaces for sensitive projects

**Document Access:**
- Only upload documents you have rights to
- Be aware of who can access workspace documents
- Delete sensitive documents when no longer needed

## Keyboard Shortcuts

### Chat Interface

- **Send Message**: `Enter`
- **New Line**: `Shift + Enter`
- **Focus Input**: `Ctrl/Cmd + K`
- **New Chat**: `Ctrl/Cmd + N`
- **Search Chats**: `Ctrl/Cmd + F`

### Navigation

- **Next Chat**: `Ctrl/Cmd + ]`
- **Previous Chat**: `Ctrl/Cmd + [`
- **Toggle Sidebar**: `Ctrl/Cmd + B`

## Common Issues

### Chat Not Responding

**Possible Causes:**
- Model not published by admin
- API key issues
- Network connectivity
- Rate limits reached

**Solutions:**
1. Refresh the page
2. Try a different model
3. Check admin console for errors
4. Contact administrator

### Documents Not Processing

**Possible Causes:**
- Unsupported file format
- File too large
- Corrupted file
- Processing queue backlog

**Solutions:**
1. Wait a few minutes
2. Try re-uploading
3. Convert to supported format
4. Split large files

### Can't Access Workspace

**Possible Causes:**
- Not invited to workspace
- Invitation expired
- Removed from workspace
- Account permissions changed

**Solutions:**
1. Check your invitations
2. Contact workspace administrator
3. Verify your email address
4. Contact system administrator

## Getting Help

### In-App Support

- Check tooltips (hover over icons)
- Review help documentation
- Contact administrator

### Community Support

- GitHub Issues: Technical problems
- GitHub Discussions: Questions and ideas
- Documentation: Comprehensive guides

### Administrator Support

Contact your BookBag administrator for:
- Access issues
- Model availability
- Workspace invitations
- Feature requests
- Technical problems

## What's Next?

Now that you understand the basics:

1. **Explore Features**: Try different models, upload documents, create workspaces
2. **Read Admin Docs**: If you're an administrator, see [CONFIGURATION.md](CONFIGURATION.md)
3. **Join Community**: Participate in discussions and share feedback
4. **Stay Updated**: Check [CHANGELOG.md](../CHANGELOG.md) for new features

For technical documentation, see:
- [Installation Guide](INSTALL.md)
- [Configuration Guide](CONFIGURATION.md)
- [Developer Guide](DEVELOPER_GUIDE.md)
- [Troubleshooting](TROUBLESHOOTING.md)

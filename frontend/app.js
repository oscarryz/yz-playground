// Yz Playground Frontend Application
class YzPlayground {
    constructor() {
        this.apiBase = 'http://localhost:8080/api';
        this.codeEditor = document.getElementById('code-editor');
        this.outputContent = document.getElementById('output-content');
        this.outputStatus = document.getElementById('output-status');
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.errorModal = document.getElementById('error-modal');
        this.errorContent = document.getElementById('error-content');
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadDefaultCode();
        this.updateCompilerVersion();
        this.updateConfig();
    }

    bindEvents() {
        // Button events
        document.getElementById('run-btn').addEventListener('click', () => this.runCode());
        document.getElementById('clear-btn').addEventListener('click', () => this.clearCode());
        document.getElementById('share-btn').addEventListener('click', () => this.shareCode());
        
        // Modal events
        document.getElementById('close-error').addEventListener('click', () => this.hideError());
        document.getElementById('error-modal').addEventListener('click', (e) => {
            if (e.target === this.errorModal) this.hideError();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.runCode();
                } else if (e.key === 'k') {
                    e.preventDefault();
                    this.clearCode();
                }
            }
        });

        // Auto-save to localStorage
        this.codeEditor.addEventListener('input', () => {
            localStorage.setItem('yz-playground-code', this.codeEditor.value);
        });

        // Load from localStorage
        const savedCode = localStorage.getItem('yz-playground-code');
        if (savedCode) {
            this.codeEditor.value = savedCode;
        }
    }

    loadDefaultCode() {
        if (!localStorage.getItem('yz-playground-code')) {
            const defaultCode = `// Welcome to Yz Playground!
// Try this simple example:

main : {
    println("Hello, World!")
    println("Welcome to the Yz programming language!")
}`;
            this.codeEditor.value = defaultCode;
        }
    }

    async runCode() {
        const code = this.codeEditor.value.trim();
        
        if (!code) {
            this.showError('Please enter some Yz code to execute.');
            return;
        }

        this.showLoading();
        this.updateStatus('executing', 'Executing your code...');

        try {
            const response = await fetch(`${this.apiBase}/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code })
            });

            const result = await response.json();

            if (response.ok) {
                if (result.success) {
                    this.updateStatus('success', 'Execution completed');
                    this.outputContent.textContent = result.output || '(No output)';
                } else {
                    this.updateStatus('error', 'Execution failed');
                    this.outputContent.textContent = result.error || 'Unknown error occurred';
                }
            } else {
                this.updateStatus('error', 'Request failed');
                this.outputContent.textContent = result.error || 'Server error occurred';
            }
        } catch (error) {
            this.updateStatus('error', 'Connection failed');
            this.outputContent.textContent = `Network error: ${error.message}`;
        } finally {
            this.hideLoading();
        }
    }

    clearCode() {
        this.codeEditor.value = '';
        this.outputContent.textContent = '';
        this.updateStatus('ready', 'Ready');
        localStorage.removeItem('yz-playground-code');
    }

    shareCode() {
        const code = this.codeEditor.value.trim();
        
        if (!code) {
            this.showError('Please enter some code before sharing.');
            return;
        }

        // Create a shareable URL with the code encoded
        const encodedCode = encodeURIComponent(code);
        const url = `${window.location.origin}${window.location.pathname}?code=${encodedCode}`;
        
        // Copy to clipboard
        navigator.clipboard.writeText(url).then(() => {
            this.showSuccess('Shareable link copied to clipboard!');
        }).catch(() => {
            // Fallback: show the URL in a prompt
            prompt('Share this link:', url);
        });
    }

    updateStatus(type, message) {
        const statusIcon = this.outputStatus.querySelector('.status-icon');
        const statusText = this.outputStatus.querySelector('.status-text');
        
        const icons = {
            ready: '⏳',
            executing: '🔄',
            success: '✅',
            error: '❌'
        };
        
        const colors = {
            ready: '#666',
            executing: '#667eea',
            success: '#28a745',
            error: '#dc3545'
        };
        
        statusIcon.textContent = icons[type] || '⏳';
        statusText.textContent = message;
        this.outputStatus.style.color = colors[type] || '#666';
    }

    showLoading() {
        this.loadingOverlay.classList.remove('hidden');
    }

    hideLoading() {
        this.loadingOverlay.classList.add('hidden');
    }

    showError(message) {
        this.errorContent.textContent = message;
        this.errorModal.classList.remove('hidden');
    }

    hideError() {
        this.errorModal.classList.add('hidden');
    }

    showSuccess(message) {
        // Simple success notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            z-index: 1001;
            font-weight: 500;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    async updateCompilerVersion() {
        try {
            const response = await fetch(`${this.apiBase}/compiler/version`);
            const data = await response.json();
            
            if (response.ok) {
                document.getElementById('compiler-version').textContent = `Compiler: ${data.version}`;
            }
        } catch (error) {
            document.getElementById('compiler-version').textContent = 'Compiler: Unknown';
        }
    }

    async updateConfig() {
        try {
            const response = await fetch(`${this.apiBase}/config`);
            const config = await response.json();
            
            if (response.ok) {
                // Update UI with configuration limits
                this.maxCodeSize = config.max_code_size;
                this.maxExecutionTime = config.max_execution_time;
                this.maxMemory = config.max_memory;
                
                // Show limits in footer
                const configLink = document.getElementById('config-link');
                configLink.textContent = `Limits: ${config.max_execution_time/1000}s, ${config.max_memory}MB`;
                configLink.title = `Max execution time: ${config.max_execution_time/1000}s, Max memory: ${config.max_memory}MB, Max code size: ${config.max_code_size} chars`;
            }
        } catch (error) {
            console.warn('Failed to load configuration:', error);
        }
    }

    // Load code from URL parameters
    loadFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        
        if (code) {
            this.codeEditor.value = decodeURIComponent(code);
            localStorage.setItem('yz-playground-code', this.codeEditor.value);
        }
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new YzPlayground();
    app.loadFromUrl();
});

// Add syntax highlighting for Yz (basic implementation)
function addSyntaxHighlighting() {
    const editor = document.getElementById('code-editor');
    
    // Basic syntax highlighting for Yz language
    const keywords = ['main', 'func', 'var', 'const', 'if', 'else', 'for', 'while', 'return', 'println', 'print'];
    
    editor.addEventListener('input', () => {
        const code = editor.value;
        // This is a basic implementation - in a real app you'd use a proper syntax highlighter
        // For now, we'll just ensure the monospace font is applied
    });
}

// Initialize syntax highlighting
document.addEventListener('DOMContentLoaded', addSyntaxHighlighting);

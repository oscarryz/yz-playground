// Yz Playground Frontend Application with CodeMirror
class YzPlayground {
    constructor() {
        this.apiBase = 'http://localhost:8080/api';
        this.codeEditor = null;
        this.outputContent = document.getElementById('output-content');
        this.outputStatus = document.getElementById('output-status');
        this.progressBar = document.getElementById('progress-bar');
        this.errorModal = document.getElementById('error-modal');
        this.errorContent = document.getElementById('error-content');
        this.settingsModal = document.getElementById('settings-modal');
        
        // Resizer elements
        this.resizer = document.getElementById('resizer');
        this.editorSection = document.getElementById('editor-section');
        this.outputSection = document.getElementById('output-section');
        
        // Settings state
        this.settings = {
            theme: 'default',
            fontSize: '16',
            tabSize: '4',
            lineNumbers: true,
            lineWrapping: true,
            autoSave: true,
            showWhitespace: false,
            showGeneratedCode: false
        };
        
        this.init();
    }

    init() {
        this.initializeCodeMirror();
        this.bindEvents();
        this.initializeResizer();
        this.initializeOutputSection();
        this.loadDefaultCode();
        this.updateConfig();
        this.bindFocusEvents();
    }

    initializeCodeMirror() {
        const textarea = document.getElementById('code-editor');
        
        // Initialize CodeMirror
        this.codeEditor = CodeMirror.fromTextArea(textarea, {
            mode: 'yz',
            theme: 'default',
            lineNumbers: true,
            lineWrapping: false, // Disable line wrapping to enable horizontal scrolling
            scrollbarStyle: 'native', // Use native scrollbars
            indentUnit: 4,
            tabSize: 4,
            indentWithTabs: false,
            autoCloseBrackets: true,
            matchBrackets: true,
            foldGutter: true,
            gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
            styleActiveLine: true,
            extraKeys: {
                'Ctrl-Enter': () => this.runCode(),
                'Cmd-Enter': () => this.runCode(),
                'Ctrl-/': 'toggleComment',
                'Cmd-/': 'toggleComment',
                'Ctrl-K': () => this.clearCode(),
                'Cmd-K': () => this.clearCode(),
                'F11': (cm) => cm.setOption('fullScreen', !cm.getOption('fullScreen')),
                'Esc': (cm) => {
                    if (cm.getOption('fullScreen')) cm.setOption('fullScreen', false);
                }
            }
        });

        // Set initial content
        this.codeEditor.setValue(this.getDefaultCode());
        
        // Auto-save to localStorage
        this.codeEditor.on('change', () => {
            localStorage.setItem('yz-playground-code', this.codeEditor.getValue());
        });

        // Load from localStorage
        const savedCode = localStorage.getItem('yz-playground-code');
        if (savedCode) {
            this.codeEditor.setValue(savedCode);
        }
        
        // Refresh the editor to ensure proper rendering and scrollbars
        setTimeout(() => {
            this.codeEditor.refresh();
        }, 100);
    }

    bindEvents() {
        // Button events
        document.getElementById('run-btn').addEventListener('click', () => this.runCode());
        document.getElementById('copy-link-btn').addEventListener('click', () => this.copyLink());
        document.getElementById('share-btn').addEventListener('click', () => this.shareCode());
        document.getElementById('settings-btn').addEventListener('click', () => this.showSettings());
        document.getElementById('clear-output').addEventListener('click', () => this.clearOutput());
        
        // Modal events
        document.getElementById('close-error').addEventListener('click', () => this.hideError());
        document.getElementById('error-modal').addEventListener('click', (e) => {
            if (e.target === this.errorModal) this.hideError();
        });

        // Settings modal events
        document.getElementById('close-settings').addEventListener('click', () => this.hideSettings());
        document.getElementById('settings-modal').addEventListener('click', (e) => {
            if (e.target === this.settingsModal) this.hideSettings();
        });
        document.getElementById('save-settings').addEventListener('click', () => this.saveSettings());
        document.getElementById('reset-settings').addEventListener('click', () => this.resetSettings());

        // Load saved preferences
        this.loadPreferences();
    }

    initializeResizer() {
        let isResizing = false;
        let startY = 0;
        let startEditorHeight = 0;
        let startOutputHeight = 0;

        // Add event listener to the resizer
        this.resizer.addEventListener('mousedown', (e) => {
            console.log('Resizer mousedown event triggered'); // Debug log
            isResizing = true;
            startY = e.clientY;
            startEditorHeight = this.editorSection.offsetHeight;
            startOutputHeight = this.outputSection.offsetHeight;
            
            this.resizer.classList.add('active');
            document.body.style.cursor = 'row-resize';
            document.body.style.userSelect = 'none';
            
            e.preventDefault();
            e.stopPropagation();
        });

        // Use document-level event listeners for mouse move and up
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            
            const deltaY = e.clientY - startY;
            const newEditorHeight = startEditorHeight + deltaY;
            const newOutputHeight = startOutputHeight - deltaY;
            
            // Set minimum heights - allow output to be minimized to 10px
            const minEditorHeight = 200;
            const minOutputHeight = 10;
            const maxEditorHeight = window.innerHeight - 160 - minOutputHeight;
            const maxOutputHeight = window.innerHeight - 160 - minEditorHeight;
            
            if (newEditorHeight >= minEditorHeight && 
                newEditorHeight <= maxEditorHeight &&
                newOutputHeight >= minOutputHeight && 
                newOutputHeight <= maxOutputHeight) {
                
                this.editorSection.style.height = newEditorHeight + 'px';
                this.outputSection.style.height = newOutputHeight + 'px';
                
                // Refresh CodeMirror to adjust to new height
                if (this.codeEditor) {
                    this.codeEditor.refresh();
                }
            }
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                console.log('Resizer mouseup event triggered'); // Debug log
                isResizing = false;
                this.resizer.classList.remove('active');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        });

        // Add hover effect for better UX
        this.resizer.addEventListener('mouseenter', () => {
            this.resizer.style.background = '#555';
        });

        this.resizer.addEventListener('mouseleave', () => {
            if (!isResizing) {
                this.resizer.style.background = '#333';
            }
        });
    }

    initializeOutputSection() {
        // Start with output section minimized
        this.outputSection.style.height = '30px';
        this.outputSection.classList.remove('has-content');
        this.updateStatus('ready', 'Ready');
    }

    bindFocusEvents() {
        // Get the header element
        const header = document.querySelector('.header');
        
        // Add focus event listener to make logo smaller
        this.codeEditor.on('focus', () => {
            header.classList.add('compact');
        });
        
        // Add blur event listener to restore logo size
        this.codeEditor.on('blur', () => {
            header.classList.remove('compact');
        });
    }

    loadPreferences() {
        // Load complete settings from localStorage
        const savedSettings = localStorage.getItem('yz-playground-settings');
        if (savedSettings) {
            try {
                this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
            } catch (e) {
                console.warn('Failed to parse saved settings:', e);
            }
        }

        // Apply settings to editor
        this.codeEditor.setOption('theme', this.settings.theme);
        this.codeEditor.setOption('fontSize', this.settings.fontSize + 'px');
        this.codeEditor.setOption('indentUnit', parseInt(this.settings.tabSize));
        this.codeEditor.setOption('lineNumbers', this.settings.lineNumbers);
        this.codeEditor.setOption('lineWrapping', this.settings.lineWrapping);
    }

    getDefaultCode() {
        return `// Welcome to Yz Playground!
// Try this simple example:

main : {
    println("Hello, World!")
    println("Welcome to the Yz programming language!")
    
    // You can also do math
    x : 10
    y : 20
    println("x + y = \`x + y\`")
}`;
    }

    loadDefaultCode() {
        // This is handled in initializeCodeMirror now
    }

    async runCode() {
        const code = this.codeEditor.getValue().trim();
        
        if (!code) {
            this.showError('Please enter some Yz code to execute.');
            return;
        }

        this.showProgress();
        this.showOutput();
        this.updateStatus('executing', 'Executing your code...');

        try {
            const response = await fetch(`${this.apiBase}/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    code,
                    show_generated_code: this.settings.showGeneratedCode
                })
            });

            const result = await response.json();

            if (response.ok) {
                if (result.success) {
                    this.updateStatus('success', 'Execution completed');
                    let output = result.output || '(No output)';
                    
                    // If generated code is available and setting is enabled, append it
                    if (result.generated_code && this.settings.showGeneratedCode) {
                        output += '\n\n=== Generated Go Code ===\n' + result.generated_code + '\n=== End Generated Code ===';
                    }
                    
                    this.outputContent.textContent = output;
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
            this.hideProgress();
        }
    }

    clearCode() {
        this.codeEditor.setValue('');
        this.hideOutput();
        this.updateStatus('ready', 'Ready');
        localStorage.removeItem('yz-playground-code');
    }

    clearOutput() {
        this.outputContent.textContent = '';
        this.updateStatus('ready', 'Ready');
        this.hideOutput();
    }

    copyLink() {
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            this.showOutput();
            this.updateStatus('success', 'Link copied to clipboard!');
            this.outputContent.textContent = url;
        }).catch(() => {
            this.showOutput();
            this.updateStatus('error', 'Failed to copy link');
            this.outputContent.textContent = 'Unable to copy link to clipboard. Please copy manually: ' + url;
        });
    }

    showOutput() {
        const outputSection = document.getElementById('output-section');
        outputSection.classList.remove('hidden');
        outputSection.classList.add('has-content');
        
        // Expand the output section if it's minimized
        if (outputSection.offsetHeight < 100) {
            outputSection.style.height = '300px';
            // Refresh CodeMirror to adjust to new height
            if (this.codeEditor) {
                this.codeEditor.refresh();
            }
        }
    }

    hideOutput() {
        const outputSection = document.getElementById('output-section');
        outputSection.classList.remove('has-content');
        // Don't actually hide it, just minimize it
        outputSection.style.height = '30px';
        // Refresh CodeMirror to adjust to new height
        if (this.codeEditor) {
            this.codeEditor.refresh();
        }
    }

    shareCode() {
        const code = this.codeEditor.getValue().trim();
        
        if (!code) {
            this.showError('Please enter some code before sharing.');
            return;
        }

        // Create a shareable URL with the code encoded
        const encodedCode = encodeURIComponent(code);
        const url = `${window.location.origin}${window.location.pathname}?code=${encodedCode}`;
        
        // Copy to clipboard
        navigator.clipboard.writeText(url).then(() => {
            this.showOutput();
            this.updateStatus('success', 'Shareable link copied to clipboard!');
            this.outputContent.textContent = url;
        }).catch(() => {
            this.showOutput();
            this.updateStatus('error', 'Failed to copy shareable link');
            this.outputContent.textContent = 'Unable to copy link to clipboard. Please copy manually:\n\n' + url;
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

    showProgress() {
        this.progressBar.classList.remove('hidden');
    }

    hideProgress() {
        this.progressBar.classList.add('hidden');
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
            this.codeEditor.setValue(decodeURIComponent(code));
            localStorage.setItem('yz-playground-code', this.codeEditor.getValue());
        }
    }

    // Settings Modal Methods
    showSettings() {
        this.loadSettingsToModal();
        this.settingsModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    hideSettings() {
        this.settingsModal.classList.add('hidden');
        document.body.style.overflow = ''; // Restore scrolling
    }

    loadSettingsToModal() {
        // Load current settings into modal
        document.getElementById('settings-theme').value = this.settings.theme;
        document.getElementById('settings-font-size').value = this.settings.fontSize;
        document.getElementById('settings-tab-size').value = this.settings.tabSize;
        document.getElementById('settings-line-numbers').checked = this.settings.lineNumbers;
        document.getElementById('settings-line-wrapping').checked = this.settings.lineWrapping;
        document.getElementById('settings-auto-save').checked = this.settings.autoSave;
        document.getElementById('settings-show-whitespace').checked = this.settings.showWhitespace;
        document.getElementById('settings-show-generated-code').checked = this.settings.showGeneratedCode;
    }

    saveSettings() {
        // Get settings from modal
        this.settings.theme = document.getElementById('settings-theme').value;
        this.settings.fontSize = document.getElementById('settings-font-size').value;
        this.settings.tabSize = document.getElementById('settings-tab-size').value;
        this.settings.lineNumbers = document.getElementById('settings-line-numbers').checked;
        this.settings.lineWrapping = document.getElementById('settings-line-wrapping').checked;
        this.settings.autoSave = document.getElementById('settings-auto-save').checked;
        this.settings.showWhitespace = document.getElementById('settings-show-whitespace').checked;
        this.settings.showGeneratedCode = document.getElementById('settings-show-generated-code').checked;

        // Apply settings to editor
        this.codeEditor.setOption('theme', this.settings.theme);
        this.codeEditor.setOption('fontSize', this.settings.fontSize + 'px');
        this.codeEditor.setOption('indentUnit', parseInt(this.settings.tabSize));
        this.codeEditor.setOption('lineNumbers', this.settings.lineNumbers);
        this.codeEditor.setOption('lineWrapping', this.settings.lineWrapping);

        // Settings are applied directly to the editor

        // Save to localStorage
        localStorage.setItem('yz-playground-settings', JSON.stringify(this.settings));
        localStorage.setItem('yz-playground-theme', this.settings.theme);
        localStorage.setItem('yz-playground-font-size', this.settings.fontSize);

        this.hideSettings();
        this.showOutput();
        this.updateStatus('success', 'Settings saved successfully!');
        this.outputContent.textContent = 'Settings have been saved and applied to the editor.';
    }

    resetSettings() {
        // Reset to default settings
        this.settings = {
            theme: 'default',
            fontSize: '16',
            tabSize: '4',
            lineNumbers: true,
            lineWrapping: true,
            autoSave: true,
            showWhitespace: false,
            showGeneratedCode: false
        };

        // Apply default settings to editor
        this.codeEditor.setOption('theme', 'default');
        this.codeEditor.setOption('fontSize', '16px');
        this.codeEditor.setOption('indentUnit', 4);
        this.codeEditor.setOption('lineNumbers', true);
        this.codeEditor.setOption('lineWrapping', true);

        // Settings are applied directly to the editor

        // Clear localStorage
        localStorage.removeItem('yz-playground-settings');
        localStorage.setItem('yz-playground-theme', 'default');
        localStorage.setItem('yz-playground-font-size', '16');

        this.loadSettingsToModal();
        this.showOutput();
        this.updateStatus('success', 'Settings reset to defaults!');
        this.outputContent.textContent = 'Settings have been reset to their default values and applied to the editor.';
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new YzPlayground();
    app.loadFromUrl();
});
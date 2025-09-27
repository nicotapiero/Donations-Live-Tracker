


    var el = document.getElementById("target");
              el.style.opacity = 0; 

        function fadeInFunc() {
              var el = document.getElementById("target");
              el.style.opacity = 0; 
              var tick = function() {
                el.style.opacity = +el.style.opacity + 0.003;
                if (+el.style.opacity < 1) {
                  (window.requestAnimationFrame && requestAnimationFrame(tick)) || setTimeout(tick, 16)
                } else {
                  fadeOutFunc();
                }
              };
              tick();
            }

            function fadeOutFunc() {
              var el = document.getElementById("target");
              el.style.opacity = 1; 
              var tick = function() {
                el.style.opacity = +el.style.opacity - 0.003;
                if (+el.style.opacity > 0) {
                  (window.requestAnimationFrame && requestAnimationFrame(tick)) || setTimeout(tick, 16)
                }
              };
              tick();
            }
    class GmailNotifier {
        constructor() {
            this.socket = io();
            this.notifications = [];
            this.setupEventListeners();
        }
        
        setupEventListeners() {
            this.socket.on('connect', () => {
                console.log('Connected to server');
                // document.getElementById('connection-status').textContent = 'Connected';
                // document.getElementById('connection-status').className = 'badge connected';
            });
            
            this.socket.on('disconnect', () => {
                console.log('Disconnected from server');
                // document.getElementById('connection-status').textContent = 'Disconnected';
                // document.getElementById('connection-status').className = 'badge disconnected';
            });
            
            // this.socket.on('status', (data) => {
            //     document.getElementById('auth-status').textContent = data.authenticated ? 'Authenticated' : 'Not Authenticated';
            //     document.getElementById('auth-status').className = data.authenticated ? 'badge connected' : 'badge disconnected';
                
            //     document.getElementById('polling-status').textContent = data.polling ? 'Active' : 'Inactive';
            //     document.getElementById('polling-status').className = data.polling ? 'badge active' : 'badge disconnected';
                
            //     if (data.last_check) {
            //         document.getElementById('last-check-row').style.display = 'flex';
            //         document.getElementById('last-check-time').textContent = data.last_check;
            //     }
            // });
            
            // this.socket.on('new_email', (email) => {
            //     this.addNotification(email);
            //     this.showToast(email);
            // });

            this.socket.on('donation_test', (payload) => {
                // payload: { value: <number>, timestamp: 'HH:MM:SS' }
                this.showDonation(payload && payload.value);
            });

            this.socket.on('set_progress', (payload) => {
                const raw = payload && (typeof payload.value !== 'undefined' ? payload.value : payload);
                const num = Number(raw);
                if (!Number.isNaN(num)) {
                    this.setProgress(num);
                }
            });
        }
        
        // addNotification(email) {
        //     this.notifications.unshift(email);
            
        //     // Keep only last 20 notifications
        //     if (this.notifications.length > 20) {
        //         this.notifications = this.notifications.slice(0, 20);
        //     }
            
        //     this.renderNotifications();
        // }
        
        // renderNotifications() {
        //     const listElement = document.getElementById('notification-list');
            
        //     if (this.notifications.length === 0) {
        //         listElement.innerHTML = `
        //             <div class="empty-state">
        //                 <div class="icon">📬</div>
        //                 <h3>Waiting for notifications...</h3>
        //                 <p>New email notifications will appear here in real-time</p>
        //             </div>
        //         `;
        //         return;
        //     }
            
        //     listElement.innerHTML = this.notifications.map(email => `
        //         <div class="notification">
        //             <div class="notification-meta">
        //                 <div class="notification-from">${this.escapeHtml(email.from)}</div>
        //                 <div class="notification-time">${email.timestamp}</div>
        //             </div>
        //             <div class="notification-subject">${this.escapeHtml(email.subject)}</div>
        //             <div class="notification-snippet">${this.escapeHtml(email.snippet)}</div>
        //         </div>
        //     `).join('');
        // }
   


        showToast(email) {
            fadeInFunc()



            // const toast = document.createElement('div');
            // toast.className = 'toast';
            // toast.innerHTML = `
            //     <div style="font-weight: bold; margin-bottom: 5px;">New Email</div>
            //     <div style="font-size: 0.9em; margin-bottom: 3px;">From: ${this.escapeHtml(email.from)}</div>
            //     <div style="font-size: 0.9em;">${this.escapeHtml(email.subject)}</div>
            // `;
            
            // document.body.appendChild(toast);
            
            // // Auto-remove after 5 seconds
            // setTimeout(() => {
            //     toast.classList.add('hide');
            //     setTimeout(() => {
            //         if (toast.parentNode) {
            //             toast.parentNode.removeChild(toast);
            //         }
            //     }, 300);
            // }, 5000);
        }
        
        showDonation(value) {
            // Trigger overlay fade in as a visual cue


            document.getElementById('insidePforContainer').innerHTML = `Thank you for the \$${value} donation!`

            document.getElementById('donationAmount').value += value


            fadeInFunc();



            console.log(value)
            // // Create a simple toast using existing .toast styles
            // const toast = document.createElement('div');
            // toast.className = 'toast';
            // const safe = (value === undefined || value === null) ? '' : String(value);
            // toast.innerHTML = `<div style="font-weight: bold; margin-bottom: 5px;">Admin Toast</div>
            //                    <div style="font-size: 0.9em;">Number: ${this.escapeHtml(safe)}</div>`;
            // document.body.appendChild(toast);
            // setTimeout(() => {
            //     toast.classList.add('hide');
            //     setTimeout(() => {
            //         if (toast.parentNode) {
            //             toast.parentNode.removeChild(toast);
            //         }
            //     }, 300);
            // }, 3000);
        }

        setProgress(value) {
            const prog = document.getElementById('donationAmount');
            if (!prog) return;
            const max = Number(prog.max) || 100;
            let v = Number(value);
            if (Number.isNaN(v)) return;
            v = Math.max(0, Math.min(max, v));
            prog.value = v;
            console.log(`Progress set to ${v}/${max}`);
        }
        
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    }
    
    // Initialize the app
    document.addEventListener('DOMContentLoaded', () => {
        new GmailNotifier();
    });
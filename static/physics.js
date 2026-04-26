// Map DOM elements to Matter.js bodies
document.addEventListener('DOMContentLoaded', () => {
    // Wait for the icon to be injected by our index.html modify
    const initInterval = setInterval(() => {
        const gravityToggleBtns = document.querySelectorAll('#gravityToggleBtn, #mobileGravityToggleBtn');
        if (gravityToggleBtns.length > 0) {
            clearInterval(initInterval);
            
            let isGravityActive = false;
            let engine, runner, world;
            let domBodies = [];

            gravityToggleBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (isGravityActive) return;
                    isGravityActive = true;

                    gravityToggleBtns.forEach(b => {
                        b.style.color = '#ff3333';
                        b.classList.add('fa-bounce');
                    });
                    
                    // Also close mobile menu if it's open
                    const mobileMenu = document.getElementById('mobileMenu');
                    const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
                    if (mobileMenu) mobileMenu.classList.remove('active');
                    if (mobileMenuOverlay) mobileMenuOverlay.classList.remove('active');

                    // Add a small delay so the button animation plays briefly before the world collapses
                    setTimeout(initPhysics, 400);
                });
            });

            function initPhysics() {
            // Add physics CSS dynamically
            const style = document.createElement('style');
            style.innerHTML = `
                body.physics-mode {
                    overflow: hidden !important;
                    height: 100vh !important;
                }
                .physics-element {
                    position: fixed !important;
                    margin: 0 !important;
                    transition: none !important;
                    z-index: 9999 !important;
                    cursor: grab !important;
                    box-sizing: border-box !important;
                }
                .physics-element, .physics-element * {
                    user-select: none !important;
                    -webkit-user-drag: none !important;
                }
                .physics-element:active {
                    cursor: grabbing !important;
                }
            `;
            document.head.appendChild(style);
            document.body.classList.add('physics-mode');

            // Matter.js module aliases
            const Engine = Matter.Engine,
                Runner = Matter.Runner,
                Bodies = Matter.Bodies,
                Composite = Matter.Composite,
                Mouse = Matter.Mouse,
                MouseConstraint = Matter.MouseConstraint;

            engine = Engine.create();
            world = engine.world;

            // Elements to physics-ify.
            const selectors = [
                '.product-card',
                '.collection-card',
                '.hero-title',
                '.hero-subtitle',
                '.cta-btn',
                '.about-image img',
                '.section-header h2',
                'nav .logo',
                '.nav-links li',
                '.footer-brand h2',
                '.footer-brand p',
                '.about-stats div',
                '.nav-icons i',
                '.nav-icons div'
            ];

            const elements = [];
            selectors.forEach(selector => {
                document.querySelectorAll(selector).forEach(el => elements.push(el));
            });

            // Calculate positions and create bodies
            elements.forEach((el) => {
                const rect = el.getBoundingClientRect();
                
                let isTriggerBtn = false;
                gravityToggleBtns.forEach(b => { if (el === b) isTriggerBtn = true; });
                
                if (rect.width === 0 || rect.height === 0 || isTriggerBtn) return; // don't physics the gravity button itself!

                // Explicitly set width and height to maintain appearance when position: fixed is applied
                el.style.width = rect.width + 'px';
                el.style.height = rect.height + 'px';

                // Fixed positioning coordinate base
                let x = rect.left + rect.width / 2;
                let y = rect.top + rect.height / 2;

                // If element is offscreen significantly, clump it into the viewport so it falls down visibly
                if (y < -rect.height) {
                    y = -rect.height + Math.random() * 50;
                }
                if (y > window.innerHeight + rect.height) {
                    y = window.innerHeight / 4 + Math.random() * 200;
                    x = window.innerWidth / 4 + Math.random() * (window.innerWidth / 2);
                }

                // If outside X bounds, push it inside
                if (x < 0) x = rect.width / 2;
                if (x > window.innerWidth) x = window.innerWidth - rect.width / 2;

                const body = Bodies.rectangle(x, y, rect.width, rect.height, {
                    restitution: 0.7, // Bounciness
                    friction: 0.1,
                    frictionAir: 0.02,
                    density: 0.005
                });

                // Add random angular velocity for a chaotic explosive effect
                Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.15);

                domBodies.push({ element: el, body: body, width: rect.width, height: rect.height });
                Composite.add(world, body);
            });

            // Move elements to document body and apply fixed position
            domBodies.forEach(db => {
                const el = db.element;
                el.classList.add('physics-element');
                document.body.appendChild(el);
                el.style.transformOrigin = 'center center';

                // Disable traditional link click behavior when physics is on
                if (el.tagName.toLowerCase() === 'a' || el.querySelector('a')) {
                    el.addEventListener('click', (e) => e.preventDefault());
                }
            });

            // Create window boundaries
            let width = window.innerWidth;
            let height = window.innerHeight;
            const wallOptions = {
                isStatic: true,
                restitution: 0.8,
                friction: 0.1
            };
            const thickness = 60;

            const ground = Bodies.rectangle(width / 2, height + thickness / 2, width + 100, thickness, wallOptions);
            const ceiling = Bodies.rectangle(width / 2, -thickness * 2, width + 100, thickness, wallOptions); // Higher ceiling so elements popping in don't get stuck instantly
            const leftWall = Bodies.rectangle(-thickness / 2, height / 2, thickness, height * 2, wallOptions);
            const rightWall = Bodies.rectangle(width + thickness / 2, height / 2, thickness, height * 2, wallOptions);

            Composite.add(world, [ground, ceiling, leftWall, rightWall]);

            // Add mouse control
            const mouse = Mouse.create(document.body);
            const mouseConstraint = MouseConstraint.create(engine, {
                mouse: mouse,
                constraint: {
                    stiffness: 0.2,
                    render: { visible: false }
                }
            });

            // To prevent Matter.js from capturing scroll events which we want blocked anyway
            mouse.element.removeEventListener("mousewheel", mouse.mousewheel);
            mouse.element.removeEventListener("DOMMouseScroll", mouse.mousewheel);

            Composite.add(world, mouseConstraint);

            // Run the Engine
            runner = Runner.create();
            Runner.run(runner, engine);

            // Sync Loop
            function updateDOM() {
                domBodies.forEach(db => {
                    const body = db.body;
                    const el = db.element;

                    const x = body.position.x - db.width / 2;
                    const y = body.position.y - db.height / 2;
                    const angle = body.angle;

                    el.style.transform = `translate(${x}px, ${y}px) rotate(${angle}rad)`;
                });

                // Keep boundaries updated if window resizes
                if (window.innerWidth !== width || window.innerHeight !== height) {
                    width = window.innerWidth;
                    height = window.innerHeight;
                    Matter.Body.setPosition(ground, { x: width / 2, y: height + thickness / 2 });
                    Matter.Body.setPosition(rightWall, { x: width + thickness / 2, y: height / 2 });
                    Matter.Body.setPosition(ceiling, { x: width / 2, y: -thickness * 2 });
                }

                requestAnimationFrame(updateDOM);
            }

            requestAnimationFrame(updateDOM);

            // Scroll to top cleanly
            window.scrollTo(0, 0);
        }
        }
    }, 100);
});

document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('.questions-form');

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const formData = new FormData(form);
        const data = {};


        for (let i = 1; i <= 10; i++) {
            const key = `q${i}`;
            const value = formData.get(key);


            data[key] = value ? parseInt(value) : null;
        }


        const answeredCount = Object.values(data).filter(val => val !== null).length;

        if (answeredCount < 10) {
            alert(`You answered ${answeredCount} out of 10 questions. Please answer all questions.`);
            return;
        }

        console.log('Form Submitted!', data);
        alert('Registration successful! Check console for data.');


    });

    // Scroll Animation Logic
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target); // Only animate once
            }
        });
    }, observerOptions);

    const elementsToAnimate = document.querySelectorAll('.page-header, .question-block, .register-btn');
    elementsToAnimate.forEach(el => {
        el.classList.add('fade-in-section');
        observer.observe(el);
    });
});

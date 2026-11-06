import { readBlockConfig } from '../../scripts/aem.js';

const DEFAULTS = {
  name: 'Lohit Kumar Sharma',
  role: 'Manager (Senior AEM Developer)',
  location: 'Gurugram, India',
  summary: 'AEM specialist with 8+ years of enterprise delivery across AEM as a Cloud Service, Edge Delivery Services, migrations, and architecture. Former AEM Technical Consultant at Adobe.',
  website: 'https://lohitkumarsharma.com',
};

const EXPERTISE = [
  'AEM Cloud Service',
  'Edge Delivery Services',
  'AEM Migration',
  'AEM Architecture',
  'AEM Dispatcher',
  'Sling Models & OSGi',
];

const EXPERIENCE = [
  { company: 'Product Based IT Firm', role: 'Manager (Senior AEM Developer)', period: 'Aug 2024 – Present' },
  { company: 'Adobe Systems India', role: 'AEM Technical Consultant', period: 'Apr 2021 – Aug 2024' },
  { company: 'Mindtree', role: 'Senior Software Engineer — AEM', period: 'Feb 2018 – Apr 2021' },
];

const CERTIFICATIONS = [
  'Adobe Certified Professional — AEM Developer (2022)',
  'Adobe Certified Expert — Business Practitioner (2020)',
  'Adobe Certified Expert — AEM 6 Developer (2018)',
];

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function section(title, items, render) {
  const wrapper = el('section', 'mrlohit-section');
  wrapper.append(el('h3', null, title));
  const list = el('ul');
  items.forEach((item) => {
    const li = el('li');
    render(li, item);
    list.append(li);
  });
  wrapper.append(list);
  return wrapper;
}

function normalizeUrl(url) {
  if (!url) return DEFAULTS.website;
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export default function decorate(block) {
  // authors may supply key/value rows (name, role, location, summary, website) to override defaults
  const config = { ...DEFAULTS };
  Object.entries(readBlockConfig(block)).forEach(([key, value]) => {
    if (key in config && value) config[key] = value;
  });
  const website = normalizeUrl(config.website);

  const intro = el('div', 'mrlohit-intro');
  intro.append(
    el('h2', 'mrlohit-name', config.name),
    el('p', 'mrlohit-role', config.role),
  );
  if (config.location) intro.append(el('p', 'mrlohit-location', config.location));
  intro.append(el('p', 'mrlohit-summary', config.summary));

  const link = el('a', 'button', 'Visit my website');
  link.href = website;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  const cta = el('p', 'button-container');
  cta.append(link);
  intro.append(cta);

  const details = el('div', 'mrlohit-details');
  details.append(
    section('Expertise', EXPERTISE, (li, item) => { li.textContent = item; }),
    section('Experience', EXPERIENCE, (li, item) => {
      li.append(
        el('strong', null, item.role),
        el('span', 'mrlohit-company', item.company),
        el('span', 'mrlohit-period', item.period),
      );
    }),
    section('Certifications', CERTIFICATIONS, (li, item) => { li.textContent = item; }),
  );

  block.replaceChildren(intro, details);
}

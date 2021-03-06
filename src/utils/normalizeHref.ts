// https://regex101.com/r/cpaNXh/1
const isStartsWithProtocolRegex = /^(?:(?:[a-z]+:)?\/\/)/;

const normalizeHref = (href: string) =>
  isStartsWithProtocolRegex.test(href) ? href : `//${href}`;

export default normalizeHref;

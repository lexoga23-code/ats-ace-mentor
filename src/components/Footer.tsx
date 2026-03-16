const Footer = () => (
  <footer className="py-12 px-6 border-t border-border bg-card">
    <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
      <div className="text-sm text-muted-foreground">© 2026 ScoreCV · contact.scorecv@gmail.com</div>
      <div className="flex gap-8 text-sm font-medium text-muted-foreground">
        <a href="#" className="hover:text-primary transition-colors">Confidentialité</a>
        <a href="#" className="hover:text-primary transition-colors">CGV</a>
        <a href="#" className="hover:text-primary transition-colors">Mentions légales</a>
      </div>
    </div>
  </footer>
);

export default Footer;

/*
Root-Objekt: Dieses Objekt enthält die Spiele-Liste
*/
var kniffelViewModel = function(){
    this.spieleListe = ko.observableArray();          //Alle Spiele einer Spielrunde
    this.indexAktivesSpiel = ko.observable(-1);       //Index des aktiven Spiels innerhalb der SpieleListe
    this.wuerfelRunde = new wuerfelRundeViewModel();  //Referenz auf die Würfel
    this.wuerfelRunde.create();                       //Würfel erzeugen

    /*Liefert eine Referenz auf das aktive Spiel*/
    this.aktivesSpiel = ko.computed(function() {
      if(this.spieleListe().length == 0)
        return null;
      if(this.indexAktivesSpiel() == -1)
        return null;
      if(this.indexAktivesSpiel() >= this.spieleListe().length)
        return null;

      return this.spieleListe()[this.indexAktivesSpiel()];
    }, this);

    /*
    Fügt der SpieleListe ein (neues) Spiel hinzu
    keepSpieler: Dieses Flag gibt an, ob die Spieler und ihre Namen für das neue Spiel übernommen werden sollen
    */
    this.addSpiel = function (keepSpieler) {
        var index = this.spieleListe().length;   //enthält den index des neuen Spiels innerhalb der SpieleListe
        //Erzeuge das neue Spiel-Objekt
        var newSpiel = new spielViewModel(keepSpieler, this, index);
        //Füge das neue Spiel-Objekt der Spiele-Liste hinzu
        this.spieleListe.push(newSpiel);
        this.indexAktivesSpiel(index);
    }.bind(this);

    /*
    Wechselt das aktive Spiel-Objekt
    index: der Index des Spiels, das aktiv sein soll
    */
    this.changeActiveSpiel = function(index){
      this.indexAktivesSpiel(index);
    }.bind(this);
};

/*
Spiel Objekt
*/
var spielViewModel = function(keepSpieler, parent, indexInParent){
   this.parent = parent;                          //Referenz auf die SpieleListe
   this.indexInParent = indexInParent;            //Index dieses Spiels innerhalb der SpieleListe
   this.spielerListe = ko.observableArray();      //Alle Spieler eines Spiels
   this.indexAktiverSpieler = ko.observable(0);   //Index des aktiven Spielers
   this.wuerfelRunde = ko.observable(1);          //die aktuelle Würfelrunde innerhalb des Spiels
   this.begonnen = ko.observable(false);          //Dieses Flag gibt an, ob dieses Spiel begonnen wurde
   this.abgeschlossen = ko.observable(false);     //Dieses Flag gibt an, ob dieses Spiel abgeschlossen wurde
   this.lastLogItem = ko.observable(null);        //Hier steht das Zeil der zuletzt ausgeführten Aktion als string z.B. "einer", "zweier" etc.

   /*
   Prüft, ob es sich bei diesem Spiel um das aktive handelt
   */
   this.isActive = ko.computed(function() {
     return this.indexInParent == this.parent.indexAktivesSpiel();
   }, this);

   /*
   Liefert den oder die derzeit führenden Spieler.
   Da ein Gleichstand möglich ist, wird ein Array mit den Inizes der führenden Spieler zurückgeliefert
   */
   this.indexFuehrenderSpieler = ko.computed(function() {
     var indexFuehrenderSpieler = null; //Array für die Inizes der führenden Spieler
     var maxSum = -1;                   //Vergleichswert
     //Für alle Spieler...
     for(var i=0;i<this.spielerListe().length;i++)
     {
       //...prüfe die Endsumme...
       if(this.spielerListe()[i].endSumme() > maxSum)
       {
         //...ist sie höher als der Vergleichswert -> aktualisiere den Vergleichswert
         maxSum = this.spielerListe()[i].endSumme();
         //...initialisiere das Array mit dem Spielerindex
         indexFuehrenderSpieler = [i];
       }else if(this.spielerListe()[i].endSumme() == maxSum)
       {
         //...ist sie gleich dem Vergleichswert
         //...füge den Spielerindex dem Array hinzu
         indexFuehrenderSpieler.push(i);
       }
     }
     return indexFuehrenderSpieler;
   }, this);

   /*
   Fügt der SpielerListe einen Spieler hinzu
   spielerName: Name des Spielers
   */
   this.addSpieler = function (spielerName) {
       var index = this.spielerListe().length;      //enthält den index des neuen Spielers innerhalb der SpielerListe
       name = spielerName || "Spieler" + (index + 1);  //Wenn kein Name übergeben wurde, dann default-Namen setzen (SpielerX)
       //Erzeuge das neue Spieler-Objekt
       var spieler = new spielerViewModel(name, this, index);
       //Füge das neue Spieler-Objekt der Spieler-Liste hinzu
       this.spielerListe.push(spieler);
   }.bind(this);

   /*
   Macht die letzt Aktion rückgängig
   */
   this.undo = function () {
     if(this.lastLogItem()){
       //setze den aktiven Spieler wieder zurück (das ist notwendig, da nach einer Log-Aktion der Spieler automatisch weitergesetzt wird)
       this.previousSpieler();
       //setze den Wert der zuletzt ausgeführten Aktion wieder auf -1
       this.spielerListe()[this.indexAktiverSpieler()].setValueForKategorie(this.lastLogItem(), -1);
       //leere den Vermerk auf die zuletzt ausgeführte Aktion
       this.lastLogItem(null);
     }
   }.bind(this);

   /*
   Setzt den nächsten Spieler auf aktiv. Handelt es sich um den letzten Spieler fängt die Runde von vorn an.
   */
   this.nextSpieler = function(){
     if(this.indexAktiverSpieler() < this.spielerListe().length -1)
     {
        //Es sind noch nachfolgende Spieler vorhanden, also erhähe den Index des aktiven Spielers
        this.indexAktiverSpieler(this.indexAktiverSpieler() + 1);
     }
     else
     {
        //Es sind keine nachfolgenden Spieler mehr vorhanden, also setze den Index des aktiven Spielers wieder auf 0...
        this.indexAktiverSpieler(0);
        //...und zähle die Würfelrunde eins hoch
        this.wuerfelRunde(this.wuerfelRunde() + 1);
      }

      this.begonnen(true);

      //Nach 13 Runden ist Schluss
      if(this.wuerfelRunde() == 14){
        this.indexAktiverSpieler(-1);
        this.abgeschlossen(true);
      }
   }

   /*
   Setzt den vorherigen Spieler auf aktiv. -> Benötigt wird das in der Undo-Funktion
   */
   this.previousSpieler = function(){
      if(this.indexAktiverSpieler() > 0)
      {
        //Es sind vorhergehende Spieler vorhanden, also vermidnere den Index des aktiven Spielers
        this.indexAktiverSpieler(this.indexAktiverSpieler() - 1);
      }
      else
      {
        //Es sind keine vorhergehenden Spieler mehr vorhanden, also setze den Index des aktiven Spielers auf den letzten der Spielerliste...
        this.indexAktiverSpieler(this.spielerListe().length -1);
        //...und zähle die Würfelrunde wieder eins runter
        this.wuerfelRunde(this.wuerfelRunde() - 1);
      }

      this.begonnen(true);

      //War das Spiel eigentlich schon abgeschlossen, mache das rückgängig
      if(this.wuerfelRunde() <= 13)
        this.abgeschlossen(false);
   }

   if(keepSpieler && this.indexInParent > 0){
     //Referenz auf vorhergehendes Spiel holen
     var previousSpiel = this.parent.spieleListe()[this.indexInParent - 1];
     //Erzeuge Spielerliste
     for(var k=0;k<previousSpiel.spielerListe().length;k++)
     {
       this.addSpieler(previousSpiel.spielerListe()[k].spielerName());
     }
   }else{
     //Initialisiere das Spiel mit mindestens einem Spieler
     this.addSpieler();
  }
};

/*
Spieler-Objekt: enthält den Namen sowie sämtliche Werte des Spielers
*/
var spielerViewModel = function(spielerName, parent, indexInParent){
   this.parent = parent;                          //Referenz auf die SpielerListe
   this.indexInParent = indexInParent;            //Index dieses Spielers innerhalb der SpielerListe
   this.spielerNameDefault = "Spieler" + (indexInParent + 1);

   this.spielerName = ko.observable(spielerName);
   this.einer = ko.observable(-1);
   this.zweier = ko.observable(-1);
   this.dreier = ko.observable(-1);
   this.vierer = ko.observable(-1);
   this.fuenfer = ko.observable(-1);
   this.sechser = ko.observable(-1);
   this.dreierpasch = ko.observable(-1);
   this.viererpasch = ko.observable(-1);
   this.fullhouse = ko.observable(-1);
   this.kleinestrasse = ko.observable(-1);
   this.grossestrasse = ko.observable(-1);
   this.kniffel = ko.observable(-1);
   this.chance = ko.observable(-1);

   /*
   Liefert die Referenz auf die Kategorie-Property mit dem übergebenen Namen
   kategorie: z.B "einer", "zweier" etc.
   */
   this.getKategorieByString = function(kategorie){
     switch(kategorie)
     {
       case "einer":
         return this.einer;
         break;
       case "zweier":
         return this.zweier;
         break;
       case "dreier":
         return this.dreier;
         break;
       case "vierer":
         return this.vierer;
         break;
       case "fuenfer":
         return this.fuenfer;
         break;
       case "sechser":
         return this.sechser;
         break;
       case "dreierpasch":
         return this.dreierpasch;
         break;
       case "viererpasch":
         return this.viererpasch;
         break;
       case "fullhouse":
         return this.fullhouse;
         break;
       case "kleinestrasse":
         return this.kleinestrasse;
         break;
       case "grossestrasse":
         return this.grossestrasse;
         break;
       case "kniffel":
         return this.kniffel;
         break;
       case "chance":
         return this.chance;
         break;
     }
   }

   /*
   Prüft, ob es sich bei diesem Spieler um den aktiven handelt
   */
   this.isActive = ko.computed(function() {
     return this.indexInParent == this.parent.indexAktiverSpieler();
   }, this);

   /*
   Prüft, ob es sich bei diesem Spieler um den (oder einen der) aktiven handelt
   */
   this.isFuehrend = ko.computed(function() {
     return this.parent.indexFuehrenderSpieler() == null ? false : this.parent.indexFuehrenderSpieler().indexOf(this.indexInParent) > -1;
   }, this);

   /*
   Prüft, ob ein Spielername eingeloggt ist, oder ob es noch der Default-Name und somit veränderbar ist
   */
   this.canChangeSpielerName = ko.computed(function() {
     return this.spielerName() == this.spielerNameDefault;
   }, this);

   /*
   Prüft, ob eine Kategorie eingeloggt, also nicht  -1 ist
   kategorie: z.B. "einer", "zweier" etc.
   */
   this.isKategorieLogged = function (kategorie) {
     return ko.computed(function() {
       var kategorieRef = this.getKategorieByString(kategorie);
       return kategorieRef() != -1;
   }, this)};

   /*
   Prüft, ob eine Kategorie mit dem übergebenen Wert eingeloggt, also nicht  -1 ist
   kategorie: z.B. "einer", "zweier" etc.
   value: Wert der auf Gleichheit geprüft werden soll
   */
   this.isKategorieLoggedWithValue = function (kategorie, value) {
     return ko.computed(function() {
       var kategorieRef = this.getKategorieByString(kategorie);
       return kategorieRef() == value;
   }, this)};

   /*
   Das übergebene Input-Element soll als disabled angezeigt werden, wenn:
   - der Spieler nicht aktiv ist
   - die Kategorie eingelogt ist (gilt für Textfelder, Buttons sind in dem Fall unsichtbar)
   - der Wert des Input-Elements gleich dem für diese Kategorie eingeloggten Wert ist
   */
   this.disable = function (element) {
     //kategorie ist im DOM-Objekt als name hinterlegt
     var kategorie = element.name;
     //Wert ist im DOM-Objekt als value hinterlegt
     var value = parseInt(element.value);

     return ko.computed(function() {
       var kategorieRef = this.getKategorieByString(kategorie);
       return (kategorieRef() == value && kategorieRef() != -1) || !this.isActive();
   }, this)};

   /*
   Das übergebene Input-Element soll sichtbar sein, wenn:
   - der Spieler aktiv ist UND die Kategorie nicht eingeloggt ist
   - der Wert des Input-Elements gleich dem für diese Kategorie eingeloggten Wert ist
   */
   this.visible = function (element) {
     //kategorie ist im DOM-Objekt als name hinterlegt
     var kategorie = element.name;
     //Wert ist im DOM-Objekt als value hinterlegt
     var value = parseInt(element.value);

     return ko.computed(function() {
       var kategorieRef = this.getKategorieByString(kategorie);
       return (kategorieRef() == value || (this.isActive() && kategorieRef() == -1));
   }, this)};

   /*
   Summen bilden mithilfe von computed functions
   */
   this.summeOben = ko.computed(function() {
     var sumOben = 0;
     sumOben += parseInt(this.einer() == -1 ? 0 : this.einer());
     sumOben += parseInt(this.zweier() == -1 ? 0 : this.zweier());
     sumOben += parseInt(this.dreier() == -1 ? 0 : this.dreier());
     sumOben += parseInt(this.vierer() == -1 ? 0 : this.vierer());
     sumOben += parseInt(this.fuenfer() == -1 ? 0 : this.fuenfer());
     sumOben += parseInt(this.sechser() == -1 ? 0 : this.sechser());
     return sumOben;
    }, this);

    this.bonus = ko.computed(function() {
      return this.summeOben() >= 63 ? 35 : 0;
    }, this);

    this.gesamtOben = ko.computed(function() {
      return this.summeOben() + this.bonus();
    }, this);

    this.gesamtUnten = ko.computed(function() {
      var gesamtUnten = 0;
      gesamtUnten += parseInt(this.dreierpasch()  == -1 ? 0 : this.dreierpasch() );
      gesamtUnten += parseInt(this.viererpasch()  == -1 ? 0 : this.viererpasch()  );
      gesamtUnten += parseInt(this.fullhouse()  == -1 ? 0 : this.fullhouse() );
      gesamtUnten += parseInt(this.kleinestrasse()  == -1 ? 0 : this.kleinestrasse() );
      gesamtUnten += parseInt(this.grossestrasse()  == -1 ? 0 : this.grossestrasse() );
      gesamtUnten += parseInt(this.kniffel()  == -1 ? 0 : this.kniffel() );
      gesamtUnten += parseInt(this.chance()  == -1 ? 0 : this.chance() );
      return gesamtUnten;
    }, this);

    this.endSumme = ko.computed(function() {
      return this.gesamtOben() + this.gesamtUnten();
    }, this);

    /*
    Beendet den aktuellen Zug des Spielers
    */
    this.logResult = function(kategorie){
      //Speichere die gerade ausgeführte Aktion -> um sie wieder rückgängig machen zu können
      this.parent.lastLogItem(kategorie);
      //setze den aktiven Spieler eins weiter
      this.parent.nextSpieler();
      //initialisiere die Würfel
      this.parent.parent.wuerfelRunde.initialize();
    }.bind(this);

    /*
    Setzt den übergeben Wert für die übergebene kategorie
    kategorie: z.B. "einer", "zweier" etc.
    value: neuer Wert
    */
    this.setValueForKategorie = function(kategorie, value)
    {
      var kategorieRef = this.getKategorieByString(kategorie);
      kategorieRef(value);
    }.bind(this);

    /*
    Event-handler für Punkteeingabe des Spielers entweder durch Button-Klick oder Textfeld-Eingabe
    */
    this.handleInput  = function(data, event){
      //kategorie ist im DOM-Objekt als name hinterlegt
      var kategorie = event.target.name;
      //Wert ist im DOM-Objekt als value hinterlegt
      var value = parseInt(event.target.value);

      //Wenn der Spieler nicht der aktive ist, mache gar nichts -> verlasse die Funktion
      if(!this.isActive())
        return;

      //Ansonsten setze den Wert
      this.setValueForKategorie(kategorie, value);

      //Logge den Spielzug ein, bzw. beende den Spielzug
      this.logResult(kategorie);
    }.bind(this);
};

/*
Objekt für die Würfelrunde
*/
var wuerfelRundeViewModel = function()
{
  this.wuerfelListe = ko.observableArray(); //Liste der 5 Würfel
  this.counter = ko.observable(0);          //Zähler für die Anzahl der getätigten würfe innerhalb der Würfelrunde

  /*
  Lass würfeln
  */
  this.wuerfeln = function () {
    //Für jeden Würfel in der Würfelliste -> lasse ihn würfeln
    for(var i=0;i<this.wuerfelListe().length;i++)
    {
      this.wuerfelListe()[i].wuerfeln();
    }

    //Erhöhe den Zähler -> nur 3 Würfe sind erlaubt
    if(this.counter() < 3)
      this.counter(this.counter() + 1);

  }.bind(this);

  /*
  Initialisieren der Würfelliste
  */
  this.initialize = function () {
    //Setze den Counter zurück auf 0
    this.counter(0);
    //Für jeden Würfel in der Würfelliste -> setze ihn zurück
    for(var i=0;i<this.wuerfelListe().length;i++)
    {
      this.wuerfelListe()[i].initialize();
    }
  }.bind(this);

  /*
  Erzeugt die Würfelliste
  */
  this.create = function () {
    //5 Würfel brauchen wir
    for(var i=0;i<5;i++)
    {
      //Erzeuge das Würfelobjekt...
      var wuerfel = new wuerfelViewModel(this, i);
      //...und füge es der Liste hinzu
      this.wuerfelListe().push(wuerfel);
    }
  }.bind(this);
};

/*
Würfel-Objekt
*/
var wuerfelViewModel = function(parent, indexInParent)
{
  this.parent = parent;                 //Referenz auf den Parent -> die Würfelrunde, bzw. die Würfelliste
  this.indexInParent = indexInParent;   //Index dieses Würfels innerhalb der Würfelliste
  this.wert  = ko.observable(-1);       //Wert des Würfels
  this.status = ko.observable(false);   //false: nicht ausgewählt, true: ausgewählt

  /*
  Würfel
  */
  this.wuerfeln = function () {
    //Nur Würfel, die nicht ausgewählt bzw. zur Seite gelegt wurden, sollen einen neuen Wert bekommen
    if(!this.status())
    {
      this.wert(Math.floor((Math.random() * 6) + 1)); //random value im Bereich 1 bis 6
      this.status(false);
    }
  }.bind(this);

  /*
  Initialisiere den Würfel oder setze ihn zurück
  */
  this.initialize = function () {
    this.wert(-1);        //kein Wert
    this.status(false);   //nicht ausgewählt
  }.bind(this);

  /*
  Invertiere den Status dieses Würfels
  */
  this.toggleStatus = function () {
    this.status(!this.status());
  }.bind(this);
};

import Foundation
// Translate the saved physical Carbon key; never register a competing helper shortcut.
enum DesktopShortcutMigration {
    static func read(defaults: UserDefaults) -> String {
        if let saved = defaults.string(forKey: "tokenplan.desktop.shortcut") { return saved }
        guard let json = defaults.string(forKey: "KeyboardShortcuts_togglePopover"),
              let data = json.data(using: .utf8),
              let object = try? JSONSerialization.jsonObject(with: data) as? [String: Int],
              let code = object["carbonKeyCode"], let flags = object["carbonModifiers"] else { return "" }
        let keys: [Int: String] = [0:"KeyA",1:"KeyS",2:"KeyD",3:"KeyF",4:"KeyH",5:"KeyG",6:"KeyZ",7:"KeyX",8:"KeyC",9:"KeyV",11:"KeyB",12:"KeyQ",13:"KeyW",14:"KeyE",15:"KeyR",16:"KeyY",17:"KeyT",18:"Digit1",19:"Digit2",20:"Digit3",21:"Digit4",22:"Digit6",23:"Digit5",24:"Equal",25:"Digit9",26:"Digit7",27:"Minus",28:"Digit8",29:"Digit0",30:"BracketRight",31:"KeyO",32:"KeyU",33:"BracketLeft",34:"KeyI",35:"KeyP",36:"Enter",37:"KeyL",38:"KeyJ",39:"Quote",40:"KeyK",41:"Semicolon",42:"Backslash",43:"Comma",44:"Slash",45:"KeyN",46:"KeyM",47:"Period",48:"Tab",49:"Space",50:"Backquote",51:"Backspace",53:"Escape",96:"F5",97:"F6",98:"F7",99:"F3",100:"F8",101:"F9",103:"F11",109:"F10",111:"F12",115:"Home",116:"PageUp",117:"Delete",118:"F4",119:"End",120:"F2",121:"PageDown",122:"F1",123:"ArrowLeft",124:"ArrowRight",125:"ArrowDown",126:"ArrowUp"]
        guard let key = keys[code] else { return "" }
        var parts: [String] = []
        if flags & 256 != 0 { parts.append("Super") }
        if flags & 4096 != 0 { parts.append("Control") }
        if flags & 2048 != 0 { parts.append("Alt") }
        guard !parts.isEmpty else { return "" }
        if flags & 512 != 0 { parts.append("Shift") }
        return (parts + [key]).joined(separator: "+")
    }
}

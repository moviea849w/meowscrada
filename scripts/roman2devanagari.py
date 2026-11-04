#!/usr/bin/env python3
"""roman2devanagari.py — convert the `say` lines of a scenes.json to Devanagari.

Piper's Hindi voice only speaks Devanagari; Roman Hindi is read as English noise.
This maps the vocabulary actually used in our scripts. It is deliberately NOT a
general transliterator — it only handles words it knows, and reports anything it
cannot convert so nothing slips through silently.

Numbers stay in English digits (the script rule: numbers spoken in English).

Usage:
  python3 scripts/roman2devanagari.py episodes/<slug>/scenes.json [--write]
"""

import json
import re
import sys

# word -> Devanagari. Ordered longest-first at match time.
WORDS = {
    # pronouns / function words
    "aap": "आप", "aapki": "आपकी", "aapke": "आपके", "aapko": "आपको", "aapka": "आपका",
    "hum": "हम", "humein": "हमें", "hamare": "हमारे", "main": "मैं", "meri": "मेरी",
    "wo": "वो", "woh": "वो", "uski": "उसकी", "uske": "उसके", "usko": "उसको", "uska": "उसका",
    "unhein": "उन्हें", "unka": "उनका", "unki": "उनकी", "unke": "उनके",
    "yeh": "यह", "ye": "ये", "yahi": "यही", "yah": "यह", "iska": "इसका", "iske": "इसके",
    "isliye": "इसलिए", "isi": "इसी", "is": "इस", "in": "इन", "jo": "जो", "jis": "जिस",
    "kabhi": "कभी", "kabhi-kabhi": "कभी-कभी", "kuch": "कुछ", "koi": "कोई",
    "sab": "सब", "sabne": "सबने", "sabhi": "सभी", "sabse": "सबसे",
    "ek": "एक", "do": "दो", "teen": "तीन", "chaar": "चार", "paanch": "पाँच",
    "chhe": "छह", "saat": "सात", "aath": "आठ", "nau": "नौ", "das": "दस",
    "hazaar": "हज़ार", "lakh": "लाख", "crore": "करोड़",
    # common verbs
    "hai": "है", "hain": "हैं", "tha": "था", "the": "थे", "thi": "थी", "thay": "थे",
    "hoga": "होगा", "hota": "होता", "hoti": "होती", "hote": "होते", "ho": "हो", "hua": "हुआ",
    "kiya": "किया", "karna": "करना", "karta": "करता", "karte": "करते", "karti": "करती",
    "karke": "करके", "kar": "कर", "kaam": "काम", "karega": "करेगा",
    "jaata": "जाता", "jaati": "जाती", "jaate": "जाते", "gaya": "गया", "gayi": "गई",
    "rakha": "रखा", "rakhe": "रखे", "rakhta": "रखता",
    "soya": "सोया", "soyein": "सोएं", "sona": "सोना", "sone": "सोने", "so": "सो",
    "jaag": "जाग", "jaaga": "जागा", "jaagta": "जागता", "jaagte": "जागते", "jaagke": "जागकर",
    "jaagta": "जागता", "jaagne": "जागने", "jaagti": "जागती",
    "rukte": "रुकते", "ruka": "रुका", "rokna": "रोकना", "rok": "रोक",
    "mila": "मिला", "mile": "मिले", "dikhne": "दिखने", "dikhta": "दिखता",
    "samajh": "समझ", "samajhna": "समझना", "pata": "पता",
    "bola": "बोला", "bola gaya": "बोला गया", "kehte": "कहते", "kehta": "कहता",
    "naapti": "नापती", "naapna": "नापना", "naap": "नाप",
    "bana": "बना", "banti": "बनती", "banta": "बनता", "banne": "बनने",
    "gino": "गिनो", "ginti": "गिनती", "ghata": "घटा", "ghatake": "घटाके",
    "beh": "बह", "behjaata": "बह जाता", "le": "ले", "leta": "लेता", "liya": "लिया",
    "phenkna": "फेंकना", "phenk": "फेंक", "bhar": "भर",
    "chalu": "चालू", "band": "बंद", "khuli": "खुली", "khula": "खुला", "khulte": "खुलते",
    "girte": "गिरते", "gir": "गिर", "chalte": "चलते", "chalana": "चलाना",
    "maar": "मार", "marta": "मरता", "mare": "मरे", "mar": "मर", "jaata": "जाता",
    "jiye": "जिए", "khaate": "खाते", "khaana": "खाना", "kha": "खा",
    "fatne": "फटने", "fati": "फटी", "paka": "पका", "pak": "पक",
    "theek": "ठीक", "try": "कोशिश", "shuru": "शुरू", "ruk": "रुक",
    # nouns
    "raat": "रात", "din": "दिन", "saal": "साल", "ghanta": "घंटा", "ghante": "घंटे",
    "hafte": "हफ्ते", "hafte mein": "हफ्ते में", "mahine": "महीने", "mahina": "महीना",
    "aakhri": "आख़िरी", "pehla": "पहला", "pehli": "पहली", "pehle": "पहले",
    "aankhein": "आँखें", "aankhon": "आँखों", "aankh": "आँख",
    "dimaag": "दिमाग़", "dimaag ki": "दिमाग़ की", "dimaag ka": "दिमाग़ का",
    "dimaag ke": "दिमाग़ के", "dimaag mein": "दिमाग़ में",
    "cells": "सेल्स", "cell": "सेल", "gap": "गैप", "hisse": "हिस्से", "hissa": "हिस्सा",
    "neend": "नींद", "nind": "नींद", "aaram": "आराम", "thakan": "थकान",
    "thake": "थके", "thaka": "थका", "dabav": "दबाव", "dabaav": "दबाव",
    "safai": "सफ़ाई", "kachra": "कचरा", "fluid": "फ़्लूइड",
    "saans": "साँस", "sawaal": "सवाल", "jawaab": "जवाब", "baat": "बात",
    "log": "लोग", "ladka": "लड़का", "ladki": "लड़की", "insaan": "इंसान",
    "insaanon": "इंसानों", "choohe": "चूहे", "chuhon": "चूहों",
    "dawai": "दवाई", "dawa": "दवा", "doctor": "डॉक्टर",
    "bimari": "बीमारी", "bemari": "बीमारी", "maut": "मौत", "zindagi": "ज़िंदगी",
    "marzi": "मर्ज़ी", "khoon": "खून", "mausam": "मौसम",
    "vazan": "वज़न", "wazan": "वज़न", "temperature": "तापमान",
    "pressure": "दबाव", "yaadash": "याददाश्त", "yaad": "याद",
    "santulan": "संतुलन", "shaq": "शक", "vehmi": "वहमी", "sochne": "सोचने",
    "chidchida": "चिड़चिड़ा", "pan": "पन", "cheezein": "चीज़ें", "cheez": "चीज़",
    "asli": "असली", "sign": "साइन", "board": "बोर्ड", "insaan": "इंसान",
    "ladkhada": "लड़खड़ाहट", "hat": "हट", "kamzor": "कमज़ोर",
    "pachtaawa": "पछतावा", "bilkul": "बिलकुल", "wajah": "वजह",
    "khatarnaak": "खतरनाक", "bahut": "बहुत", "record": "रिकॉर्ड",
    "kursi": "कुर्सी", "jhoolte": "झूलते", "jhoolta": "झूलता",
    "fuel": "फ़्यूल", "tape": "टेप", "chemical": "केमिकल",
    "jagah": "जगह", "jahan": "जहाँ", "padhna": "पढ़ना", "jaanne": "जानने",
    "bana": "बना", "rehta": "रहता", "rahe": "रहे", "raha": "रहा", "rahi": "रही",
    "chauda": "चौड़ा", "zyada": "ज़्यादा", "kam": "कम",
    "gaadi": "गाड़ी", "ghar": "घर", "raaste": "रास्ते", "hissa": "हिस्सा",
    "poora": "पूरा", "poori": "पूरी", "aadha": "आधा", "bas": "बस",
    "dheere": "धीरे", "thoda": "थोड़ा", "thodi": "थोड़ी", "aakhir": "आख़िर",
    "khinch": "खिंच", "khinchke": "खिंचके", "phir": "फिर", "abhi": "अभी",
    "ab": "अब", "toh": "तो", "to": "तो", "bhi": "भी", "hi": "ही", "na": "ना",
    "nahi": "नहीं", "nahin": "नहीं", "aur": "और", "ya": "या", "lekin": "लेकिन",
    "magar": "मगर", "par": "पर", "mein": "में", "me": "में", "se": "से", "ka": "का",
    "ki": "की", "ke": "के", "ko": "को", "tak": "तक", "pe": "पे", "ke liye": "के लिए",
    "liye": "लिए", "jaise": "जैसे", "jaisi": "जैसी", "jaisa": "जैसा",
    "kyunki": "क्योंकि", "kyun": "क्यों", "kya": "क्या", "kaise": "कैसे", "kaisa": "कैसा",
    "kab": "कब", "kahan": "कहाँ", "kitna": "कितना", "kitni": "कितनी", "kitne": "कितने",
    "kitni der": "कितनी देर", "der": "देर",
    "hamesha": "हमेशा", "dobara": "दोबारा", "lagatar": "लगातार", "ausat": "औसत",
    "aas": "आस", "paas": "पास", "saamne": "सामने", "andar": "अंदर", "bahar": "बाहर",
    "upar": "ऊपर", "neeche": "नीचे", "beech": "बीच", "saath": "साथ",
    "matlab": "मतलब", "sach": "सच", "ajeeb": "अजीब", "problem": "दिक्कत",
    "dikkat": "दिक्कत", "survive": "बच", "bacche": "बचे",
}

PUNCT = {
    "।": "।", ".": "।", "?": "?", "!": "!", ",": ",", "-": "-",
}

def convert(line: str) -> tuple[str, list[str]]:
    unknown = []
    out = []
    # split on word boundaries, keep punctuation and digits
    for tok in re.findall(r"[A-Za-z']+|\d+|[^\sA-Za-z\d]+|\s+", line):
        low = tok.lower()
        if tok.isdigit():
            out.append(tok)          # numbers stay in English digits
        elif low in WORDS:
            out.append(WORDS[low])
        elif re.fullmatch(r"[A-Za-z']+", tok):
            unknown.append(tok)
            out.append(tok)
        elif tok.strip() == ".":
            out.append("।")
        else:
            out.append(tok)
    text = "".join(out)
    text = re.sub(r"\s+", " ", text).strip()
    return text, unknown


def main():
    path = sys.argv[1]
    write = "--write" in sys.argv
    scenes = json.load(open(path, encoding="utf-8"))
    total_unknown = []
    for i, s in enumerate(scenes, 1):
        say = s.get("say")
        if not say:
            continue
        dev, unknown = convert(say)
        if unknown:
            total_unknown.append((i, unknown, say))
        if write:
            s["say"] = dev
        elif i <= 5:
            print(f"{i}: {dev}")
    if write:
        json.dump(scenes, open(path, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
        print(f"✓ wrote {path}")
    if total_unknown:
        print(f"\n! {len(total_unknown)} scenes have words with no mapping:")
        for i, words, _ in total_unknown[:20]:
            print(f"  {i}: {sorted(set(words))}")
    else:
        print("\n✓ every word mapped")

if __name__ == "__main__":
    main()

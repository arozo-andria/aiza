# AIZA Code-Switching Benchmark Report

Comparing Sahara against two Malagasy-specific fine-tunes on real, self-recorded Malagasy/French code-switched administrative queries (AIZA's actual target domain - see the dataset coverage note below for why this benchmark uses its own audio rather than the official AfriSwitch benchmark).

## Models

- **sahara**: `Intron Sahara (voice.intron.io)`
- **whisper-small-malagasy**: `misterkissi/whisper-small-malagasy`
- **whisper-small-waxal-mlg**: `waxal-benchmarking/whisper-small-waxal-mlg`

## Summary (lower WER/CER is better)

| Model | N | Avg WER | Avg CER | Avg latency (s) |
|---|---|---|---|---|
| sahara | 10 | 82.6% | 45.9% | 3.2 |
| whisper-small-malagasy | 10 | 88.2% | 48.1% | 6.5 |
| whisper-small-waxal-mlg | 10 | 76.4% | 46.5% | 6.8 |

## Per-utterance results

### 01 — lost_cin
**Reference:** Very ny CIN-ko, aiza no manao déclaration de perte?

- **sahara**: 'Ferens Yenne même aux déclarations de perte\n' _(WER 80.0%, CER 42.9%)_
- **whisper-small-malagasy**: " verin'ny sehy ianinako, aiza ny manoha dia kilarasyon-deo mperita?  " _(WER 100.0%, CER 53.1%)_
- **whisper-small-waxal-mlg**: 'veriny se hianinaako aiza no manao dia kilao rasion deoparita' _(WER 80.0%, CER 44.9%)_

### 02 — birth_certificate
**Reference:** Mila certificat de naissance aho ho an'ny zanako.

- **sahara**: 'La certificat de naissance Wançen à coût\n' _(WER 62.5%, CER 37.5%)_
- **whisper-small-malagasy**: " na sertifika tena ison-sa ho an'ny zanako.  " _(WER 62.5%, CER 33.3%)_
- **whisper-small-waxal-mlg**: 'lasary tia fikadonisao ho anny zanako' _(WER 75.0%, CER 47.9%)_

### 03 — marriage_certificate
**Reference:** Aiza no maka acte de mariage eto Antananarivo?

- **sahara**: 'Est-ce ma caracte de mariage étant en arrive\n' _(WER 87.5%, CER 37.8%)_
- **whisper-small-malagasy**: ' haisakaainy makahakita teo maharihazy eto an-tananarivo?  ' _(WER 100.0%, CER 42.2%)_
- **whisper-small-waxal-mlg**: 'aisaka kay no maka haka tato mariazy eto antananarivo' _(WER 62.5%, CER 37.8%)_

### 04 — lost_drivers_license
**Reference:** Very ny permis de conduire-ko, inona no atao?

- **sahara**: 'Permet de conduire Jacques, inamo.\n' _(WER 77.8%, CER 53.5%)_
- **whisper-small-malagasy**: ' Behery mety ho kanjo irako. Inano atao?  ' _(WER 88.9%, CER 51.2%)_
- **whisper-small-waxal-mlg**: 'tery mety ho gondohirako inona no atao' _(WER 66.7%, CER 37.2%)_

### 05 — address_change
**Reference:** Mila changement d'adresse aho, any amin'ny fokontany ve?

- **sahara**: 'Le changement d’adresse unième fautin fait\n' _(WER 87.5%, CER 50.0%)_
- **whisper-small-malagasy**: ' لشoanjy monta adiraisa aho anemy fokitany ve  ' _(WER 75.0%, CER 50.0%)_
- **whisper-small-waxal-mlg**: 'lasandromandady iray sanga any aminny fokotany ve' _(WER 75.0%, CER 44.4%)_

### 06 — passport_cost
**Reference:** Ohatrinona ny frais pour ny passeport vaovao?

- **sahara**: "Au chien n'en ferait pour pas sport fort?\n" _(WER 100.0%, CER 50.0%)_
- **whisper-small-malagasy**: ' ho tsy ny fray pora-pasiparva vao?  ' _(WER 100.0%, CER 47.7%)_
- **whisper-small-waxal-mlg**: 'ohatrany ny freimpasimbaovao vaovao' _(WER 71.4%, CER 47.7%)_

### 07 — expired_cin
**Reference:** Tsy mety ny carte d'identité-ko, tapitra ny validité.

- **sahara**: 'Si méthan cachent d’identité accout obchant validité.\n' _(WER 88.9%, CER 41.2%)_
- **whisper-small-malagasy**: ' tsy mety ny karita didon-titehako tapitra ny validy ite.  ' _(WER 55.6%, CER 19.6%)_
- **whisper-small-waxal-mlg**: 'tsy mety ny karita dido antitehako tapitra ny validite' _(WER 33.3%, CER 17.6%)_

### 08 — land_title
**Reference:** Manao ahoana ny procédure ho an'ny titre foncier?

- **sahara**: 'La procédure un titre français?\n' _(WER 75.0%, CER 54.2%)_
- **whisper-small-malagasy**: ' mprosesy hirao anehititra firan-fonsiegle, ' _(WER 100.0%, CER 75.0%)_
- **whisper-small-waxal-mlg**: 'posedure ho anny hita frantsay fotsy iaka e' _(WER 100.0%, CER 77.1%)_

### 09 — criminal_record
**Reference:** Mila extrait de casier judiciaire aho, aiza no mankany?

- **sahara**: 'Mais il a extrait de gaz judiciaires Wacen Mcane?\n' _(WER 100.0%, CER 45.3%)_
- **whisper-small-malagasy**: " milaheksitireto eo gazehajodisy herao aizakaian'ny makane?  " _(WER 100.0%, CER 60.4%)_
- **whisper-small-waxal-mlg**: 'milaiky sy reto ka azy avy ity sery aho aiza kay no mankany' _(WER 100.0%, CER 56.6%)_

### 10 — processing_time
**Reference:** Firy andro no ilaina hahazoana ny déclaration de perte?

- **sahara**: 'C’est rianoz à une déclaration de perte.\n' _(WER 66.7%, CER 46.3%)_
- **whisper-small-malagasy**: ' firiandry noho aza hoana diaekilarasy ao teo perta?  ' _(WER 100.0%, CER 48.1%)_
- **whisper-small-waxal-mlg**: 'fy rihandro no azo ahoana dia kilao soa teo mpiata' _(WER 100.0%, CER 53.7%)_

## Dataset coverage note

Sahara's published language list (confirmed via docs.voice.intron.io and the challenge's own WhatsApp announcement) does not include Malagasy. The official `intronhealth/AfriSwitch` benchmark - 14 African languages code-switched with English - also does not include Malagasy, and the dataset itself is manually gated with no public preview, so we could not rely on approval landing before the deadline. No public code-switched Malagasy/French benchmark dataset appears to exist yet. That gap is itself a finding, not just a limitation: it's why AIZA always shows the raw transcript rather than silently 'correcting' it, and always offers a typed fallback instead of guessing when confidence is low.

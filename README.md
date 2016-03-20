# episim

### Data
add the persons_ref.txt, home_locations_ref.txt and dendogram.txt files to the data directory with a prefix, e.g. 'ca-persons_ref.txt'.

### prepare
note: this will take time
```
cd scripts
python population.py <prefix>
python prepare.py <prefix>
```

### run
```
cd maps
./run
```

open a browser at 'localhost:8890'
